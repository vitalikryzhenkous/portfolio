#!/usr/bin/env bash
# What may be stale on the site: a deterministic report for a human or an agent to judge. Changes nothing.
# Per case: its as-of date (frontmatter `snapshot:`, else "as of YYYY-MM-DD" in the page), commits in the
# project's repo after that date, numbers typed by hand in the frontmatter (not {{snapshot}} keys),
# and whether a newer snapshot exists. Then repos in ~/apps that have no case.
# The report quotes private commit subjects, so it goes to logs/ (gitignored), never into the site.
#
#   bash scripts/stale.sh            # writes logs/stale-$(date -u +%F).md and prints it
# Exit: 0 report written; 2 setup missing.
set -euo pipefail
cd "$(dirname "$0")/.."
APPS="$(cd .. && pwd)"
OUT="logs/stale-$(date -u +%F).md"
mkdir -p logs
[ -d src/pages/work ] || { echo "no src/pages/work"; exit 2; }

python3 -I - "$APPS" "$OUT" <<'PY'
import re, subprocess, sys
from pathlib import Path

apps, out = Path(sys.argv[1]), Path(sys.argv[2])
# case page -> the repo(s) it describes
CASES = {"jev": ["jev"], "platform": ["agent-wiki"], "status-board": ["uptime-board"],
         "babyloop": ["babyloop"], "interview-gym": ["interview-gym"]}
NOT_PROJECTS = {"portfolio", "_archive"}
MAX_SUBJECTS = 15

def git(repo, *args):
    r = subprocess.run(["git", "-C", str(repo), *args], capture_output=True, text=True)
    return r.stdout.strip() if r.returncode == 0 else ""

snaps = sorted(p.stem for p in Path("data/snapshots").glob("*.json"))
latest = snaps[-1] if snaps else None
lines = [f"# Stale report {out.stem.removeprefix('stale-')}", "",
         f"Latest snapshot: {latest or 'none'}", ""]
summary = []

for case, repos in CASES.items():
    page = Path(f"src/pages/work/{case}.mdx")
    if not page.exists():
        summary.append((case, "page missing", "", "", ""))
        continue
    text = page.read_text()
    fm = text.split("---", 2)[1] if text.startswith("---") else ""
    m = re.search(r"^snapshot:\s*(\d{4}-\d{2}-\d{2})", fm, re.M)
    if m:
        asof, src = m.group(1), "snapshot"
    else:
        m = re.search(r"as of (\d{4}-\d{2}-\d{2})", text)
        asof, src = (m.group(1), "text") if m else (git(".", "log", "-1", "--format=%cs", "--", str(page)), "page commit")
    # hand-typed numbers: digits in facts/tldr lines outside {{...}}
    hand = []
    in_block = False
    for i, l in enumerate(fm.splitlines(), start=1):
        if re.match(r"^(tldr|facts):", l):
            in_block = True
            continue
        if re.match(r"^\S", l):
            in_block = False
        if in_block and re.search(r"\d", re.sub(r"\{\{[^}]*\}\}", "", l)):
            hand.append(i)
    body_nums = sum(1 for l in text.split("---", 2)[-1].splitlines()
                    if re.search(r"\b\d{2,}\b", re.sub(r"\{\{[^}]*\}\}|\{[^}]*\}", "", l))
                    and not l.lstrip().startswith(("import", "export", "<")))
    newer = bool(latest and src == "snapshot" and latest > asof)
    lines += [f"## {case}", "",
              f"- as of **{asof}** ({src}); newer snapshot: {'yes, ' + latest if newer else 'no'}",
              f"- hand-typed numbers in tldr/facts: {len(hand)} line(s){' → ' + ', '.join(map(str, hand)) if hand else ''}",
              f"- body lines with 2+ digit numbers: {body_nums}"]
    total = 0
    for r in repos:
        repo = apps / r
        if not (repo / ".git").exists():
            lines.append(f"- {r}: repo not found")
            continue
        subj = git(repo, "log", f"--since={asof}T23:59:59", "--no-merges", "--format=%cs %s").splitlines()
        total += len(subj)
        lines.append(f"- {r}: **{len(subj)}** commits after {asof}")
        lines += [f"  - {s}" for s in subj[:MAX_SUBJECTS]]
        if len(subj) > MAX_SUBJECTS:
            lines.append(f"  - … {len(subj) - MAX_SUBJECTS} more")
    lines.append("")
    summary.append((case, asof, str(total), str(len(hand)), "yes" if newer else "no"))

covered = {r for rs in CASES.values() for r in rs}
lines += ["## Repos without a case", ""]
for d in sorted(p for p in apps.iterdir() if (p / ".git").exists()):
    if d.name in covered or d.name in NOT_PROJECTS:
        continue
    n = git(d, "rev-list", "--count", "HEAD") or "0"
    lines.append(f"- {d.name}: {n} commits, first {git(d, 'log', '--reverse', '--format=%cs') .splitlines()[0] if n != '0' else '-'}, last {git(d, 'log', '-1', '--format=%cs') or '-'}")
lines.append("")

table = ["| case | as of | commits after | hand-typed lines | newer snapshot |", "|---|---|---|---|---|"]
table += ["| " + " | ".join(row) + " |" for row in summary]
lines[4:4] = table + [""]
out.write_text("\n".join(lines) + "\n")
print("\n".join(lines))
print(f"stale: {out}", file=sys.stderr)
PY
