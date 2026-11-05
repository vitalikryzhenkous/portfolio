#!/usr/bin/env bash
# Freeze the numbers the site quotes into data/snapshots/<UTC date>.json.
# Runs on the server (reads private repos and the jev run log). From private sources the output holds
# aggregates only — counts, percentages, latencies, dates, short hashes; no text, paths, hosts or ids.
# Exception, public data: the titles, numbers and URLs of public open-source PRs (key "oss").
# babyloop: if ../babyloop/scripts/portfolio-stats.py exists, its JSON stdout goes under key "babyloop"
# as is (it should carry the commit sha and date it counted at); otherwise the key is absent.
#
#   bash scripts/snapshot.sh            # writes data/snapshots/$(date -u +%F).json
set -euo pipefail
cd "$(dirname "$0")/.."
APPS="$(cd .. && pwd)"
JEV="$APPS/jev"
OUT="data/snapshots/$(date -u +%F).json"

count_lines() { wc -l <"$1" | tr -d ' '; }
git_info() { # repo -> {"commits":N,"first":"YYYY-MM-DD","last":"YYYY-MM-DD"}
  local r="$1"
  printf '{"commits":%s,"first":"%s","last":"%s"}' \
    "$(git -C "$r" rev-list --count HEAD)" \
    "$(git -C "$r" log --reverse --format=%cs | head -1)" \
    "$(git -C "$r" log -1 --format=%cs)"
}

# --- jev: run log + savings (via jev's own code, aggregates only) -----------------------------
python_out="$("$JEV/.venv/bin/python" -I - "$JEV/src" <<'PY'
import json, math, subprocess, sys
sys.path.insert(0, sys.argv[1])
from jev import savings

def wilson(k, n, z=1.96):
    if not n:
        return None
    p = k / n
    d = 1 + z * z / n
    c = p + z * z / (2 * n)
    m = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))
    return [round((c - m) / d, 3), round((c + m) / d, 3)]

st = json.loads(subprocess.run([sys.executable.replace("python", "jev-stats"), "--all", "--json"],
                               capture_output=True, text=True, check=True).stdout)
sv = savings.report(30)
ls = st["local_share"]
out = {
    "window": {"first": st["first_ts"][:10], "last": st["last_ts"][:10]},
    "runs": st["runs"],
    "routed": st["routed"],
    "routes": st["route"],
    "local_share": {"k": ls["k"], "n": ls["n"], "pct": round(ls["k"] / ls["n"], 3), "ci95": wilson(ls["k"], ls["n"])},
    "sensitive": st["sensitive"],
    "classifier_fallback": st["clf_fallback"],
    "latency_ms": {
        "route_stage": {k: st["stages_ms"]["route"][k] for k in ("n", "p50", "p95")},
        "wall_executed": st["wall_ms_executed"],
    },
    "config_sha": sorted(st["config_sha"]),
    "savings": {
        "window_days": sv["window_days"],
        "counted_decisions": sv["counted"],
        "routes": sv["routes"],
        "saved_pct": sv["saved_pct"],
        "baseline_policy": sv["baseline_policy"],
        "model_usd_equiv": sv["model_usd_equiv"],
        "measured_cloud_usd_equiv": sv["measured_usd_equiv"],
        "kind": "estimate (cost model), not an invoice",
    },
}
print(json.dumps(out))
PY
)"

pytest_n="$(cd "$JEV" && .venv/bin/python -I -m pytest --collect-only -q 2>/dev/null | tail -1 | grep -oE '^[0-9]+')"
evals='{'; sep=''
for f in "$JEV"/evals/*.jsonl; do evals+="$sep\"$(basename "$f" .jsonl)\":$(count_lines "$f")"; sep=','; done; evals+='}'
adrs="$(ls "$JEV"/docs/adr/*.md | wc -l | tr -d ' ')"
preregs="$(ls "$JEV"/docs/preregistration-l*.md | wc -l | tr -d ' ')"

# --- public open-source PRs (GitHub, author vryzhenko): counts + merged list -------------------
oss="$(for r in Advance-Technologies-Foundation/clio Advance-Technologies-Foundation/clio-knowledge Creatio-Platform/creatio-ai-app-development-toolkit; do
  gh pr list -R "$r" --author vryzhenko --state all --limit 200 --json number,title,state,mergedAt,url \
    | python3 -c "import json,sys; print(json.dumps({'repo': '$r', 'prs': json.load(sys.stdin)}))"
done | python3 -c "
import json, sys
repos = [json.loads(l) for l in sys.stdin if l.strip()]
out = {'author': 'vryzhenko', 'repos': []}
for r in repos:
    merged = sorted([p for p in r['prs'] if p['state'] == 'MERGED'], key=lambda p: p['mergedAt'], reverse=True)
    out['repos'].append({'repo': r['repo'], 'merged': len(merged), 'open': sum(p['state'] == 'OPEN' for p in r['prs']),
                         'merged_prs': [{'number': p['number'], 'title': p['title'], 'merged': p['mergedAt'][:10], 'url': p['url']} for p in merged]})
out['merged_total'] = sum(r['merged'] for r in out['repos'])
out['open_total'] = sum(r['open'] for r in out['repos'])
print(json.dumps(out))
")"

# --- agent platform: wiki + status board (counts only) -----------------------------------------
WIKI="$APPS/agent-wiki"; BOARD="$APPS/uptime-board"
board_prs="$(gh pr list -R vitalikryzhenkous/uptime-board --state merged --limit 500 --json number --jq length)"
# the Mac app (uptime-apple) is not cloned on the server: merged PRs and their date range from GitHub
apple_prs="$(gh pr list -R vitalikryzhenkous/uptime-apple --state merged --limit 500 --json mergedAt \
  --jq '{merged: length, first: (map(.mergedAt) | min | .[:10]), last: (map(.mergedAt) | max | .[:10])}')"
platform="$(printf '{"wiki_git":%s,"board_git":%s,"board_prs_merged":%s,"mac_app_prs":%s,"policies":%s,"procedures":%s,"checks":%s}' \
  "$(git_info "$WIKI")" "$(git_info "$BOARD")" "$board_prs" "$apple_prs" \
  "$(grep -cE '^\| S[0-9]+ \|' "$WIKI/conventions/security.md")" \
  "$(ls "$WIKI"/procedures/*.md | wc -l | tr -d ' ')" \
  "$(ls "$WIKI"/checks/*.sh "$WIKI"/checks/security/*.sh | grep -v '/lib.sh$' | wc -l | tr -d ' ')")"

# --- interview-gym trainer: counts of the content its Docker build validates (counts only) -----
# The plan length comes from executing the gym's own build/algo_data.py, exactly as its build.py does.
GYM="$APPS/interview-gym"
trainer="$(python3 -I - "$GYM" <<'PY'
import glob, json, os, re, subprocess, sys
g = sys.argv[1]
py = os.path.join(g, "content/algo/data/py")
pats = [f for f in sorted(glob.glob(f"{py}/*.json")) if os.path.basename(f) not in ("cheatsheets.json", "python-primer.json")]
ex = [e for f in pats for e in json.load(open(f))["exercises"]]
ns = {"R": os.path.join(g, "content/algo")}
exec(open(os.path.join(g, "build/algo_data.py")).read(), ns)
m = re.search(r"timeoutMs = (\d+)", open(os.path.join(g, "src/app.js")).read())
if not m:
    sys.exit("snapshot: runCode timeoutMs not found in interview-gym src/app.js")
git = lambda *a: subprocess.run(["git", "-C", g, *a], capture_output=True, text=True, check=True).stdout.strip()
print(json.dumps({
    "git": {"commits": int(git("rev-list", "--count", "HEAD")), "last": git("log", "-1", "--format=%cs"), "sha": git("rev-parse", "--short", "HEAD")},
    "patterns": len(pats),
    "exercises": len(ex),
    "exercise_tests_min": min(len(e["tests"]) for e in ex),
    "behavioral": sum(len(json.load(open(f))) for f in glob.glob(f"{g}/content/beh/beh-questions-*.json")),
    "system_design": sum(len(json.load(open(f))) for f in glob.glob(f"{g}/content/sd/sd-cases-*.json")),
    "plan_days": len(ns["plan"]),
    "run_timeout_s": int(m.group(1)) // 1000,
}))
PY
)"

# --- babyloop: the project's own stats script, when it exists ----------------------------------
BL="$APPS/babyloop"; babyloop=""
if [ -f "$BL/scripts/portfolio-stats.py" ]; then
  babyloop="$(cd "$BL" && uv run --quiet python -I scripts/portfolio-stats.py)"
  python3 -c 'import json,sys; json.loads(sys.argv[1])' "$babyloop"  # must be valid JSON, else stop
fi

BABYLOOP_JSON="$babyloop" python3 - "$OUT" <<PY
import json, os, sys
snap = {
    "\$comment": "Generated by scripts/snapshot.sh. Aggregates only, plus public PR titles and URLs. Every number on the site cites a key in this file.",
    "taken_utc": "$(date -u +%FT%TZ)",
    "jev": {
        "git": $(git_info "$JEV"),
        "tests_pytest_collected": int("${pytest_n:-0}") or None,
        "eval_cases": $evals,
        "adrs": $adrs,
        "preregistrations": $preregs,
        "live": $python_out,
    },
    "oss": $oss,
    "platform": $platform,
    "trainer": $trainer,
}
if os.environ.get("BABYLOOP_JSON"):
    snap["babyloop"] = json.loads(os.environ["BABYLOOP_JSON"])
snap["jev"]["eval_cases_total"] = sum(snap["jev"]["eval_cases"].values())
with open(sys.argv[1], "w") as f:
    json.dump(snap, f, indent=2)
    f.write("\n")
print(f"snapshot: {sys.argv[1]}")
PY
