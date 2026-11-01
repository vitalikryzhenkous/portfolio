#!/usr/bin/env bash
# Public-site guard: fail if anything private could ship.
# Exit 0 = PASS, 1 = FAIL (same semantics as agent-wiki checks).
# Prints only file:line and the rule name — never the matched text (CI logs are public).
#
# Rules = generic regexes below + exact strings from an optional private list:
#   local: private/denylist.txt (gitignored), CI: $FORBIDDEN_EXTRA (repo secret, one per line).
set -uo pipefail
cd "$(dirname "$0")/.."

targets=(src public data scripts .github astro.config.mjs package.json README.md)
[[ -d dist ]] && targets+=(dist)
existing=()
for t in "${targets[@]}"; do [[ -e $t ]] && existing+=("$t"); done

declare -A rules=(
  [tailnet-domain]='\.ts\.net\b'
  [tailnet-name]='\btail[0-9a-f]{6}\b'
  [ip-cgnat]='\b100\.(6[4-9]|[7-9][0-9]|1[01][0-9]|12[0-7])\.[0-9]{1,3}\.[0-9]{1,3}\b'
  [ip-lan]='\b(192\.168|10\.[0-9]{1,3}|172\.(1[6-9]|2[0-9]|3[01]))\.[0-9]{1,3}\.[0-9]{1,3}\b'
  [home-path]='/home/[a-z_][a-z0-9_-]*|/Users/[A-Za-z]'
  [host-name]='\bm920q-[a-z]+\b'
  [config-path]='~/\.config/|keys\.toml|hmac\.key|\.ts\.env'
  [session-url]='claude\.ai/code/session'
  [token]='sk-ant-[A-Za-z0-9_-]{8,}|gh[pousr]_[A-Za-z0-9]{20,}|tskey-[A-Za-z0-9-]{8,}|ntn_[A-Za-z0-9]{20,}|secret_[A-Za-z0-9]{30,}'
)

fail=0
report() { # $1 rule; grep -n lines on stdin -> file:line only (no pipe: must set fail in this shell)
  while IFS= read -r hit; do
    [[ -z $hit ]] && continue
    echo "FAIL [$1] ${hit%%:*}:$(cut -d: -f2 <<<"$hit")"
    fail=1
  done
}

exclude=(--exclude=forbidden.sh --exclude-dir=node_modules --exclude-dir=private)
for name in "${!rules[@]}"; do
  report "$name" < <(grep -rnIE "${exclude[@]}" -e "${rules[$name]}" "${existing[@]}" 2>/dev/null)
done

extra=()
[[ -f private/denylist.txt ]] && mapfile -t -O "${#extra[@]}" extra < <(grep -v '^\s*\(#\|$\)' private/denylist.txt)
[[ -n ${FORBIDDEN_EXTRA:-} ]] && mapfile -t -O "${#extra[@]}" extra < <(grep -v '^\s*$' <<<"$FORBIDDEN_EXTRA")
for i in "${!extra[@]}"; do
  report "private-list#$((i + 1))" < <(grep -rnIiF "${exclude[@]}" -e "${extra[$i]}" "${existing[@]}" 2>/dev/null)
done

if ((fail)); then
  echo "forbidden: FAIL"
  exit 1
fi
echo "forbidden: PASS (${#rules[@]} generic rules, ${#extra[@]} private strings, targets: ${existing[*]})"
