#!/usr/bin/env bash
# Publish root-site/ to the GitHub Pages root (repo vitalikryzhenkous/vitalikryzhenkous.github.io).
# Source of truth stays here; the target repo holds a generated copy. Runs the forbidden-pattern guard first.
#
#   bash scripts/publish-root-site.sh            # dry run: show the diff
#   bash scripts/publish-root-site.sh --push     # commit + push to main
set -euo pipefail
cd "$(dirname "$0")/.."
REPO="vitalikryzhenkous/vitalikryzhenkous.github.io"

bash scripts/forbidden.sh >/dev/null || { echo "publish-root-site: forbidden.sh FAIL — not publishing"; exit 1; }

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
gh repo clone "$REPO" "$work/site" -- -q 2>/dev/null || { echo "clone failed"; exit 1; }
cd "$work/site"
git checkout -q -B main
find . -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -R "$OLDPWD/root-site/." .
touch .nojekyll
git add -A
if git diff --cached --quiet; then echo "publish-root-site: nothing to change"; exit 0; fi
git diff --cached --stat
if [[ "${1:-}" != "--push" ]]; then echo "dry run — re-run with --push to publish"; exit 0; fi
git commit -q -m "Publish root site from portfolio/root-site ($(git -C "$OLDPWD" rev-parse --short HEAD))

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push -q -u origin main
echo "publish-root-site: pushed $(git rev-parse --short HEAD)"
