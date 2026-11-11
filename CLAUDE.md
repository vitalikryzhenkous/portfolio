# portfolio

Public repo: nothing private goes in (see `scripts/forbidden.sh`).

## Git
- Stage only named files: `git add <path> ...`. Never `git add -A` / `git add .`.
- Before every commit: `git --no-pager diff --cached --stat`; unexpected files → unstage, do not commit.
- Run Lighthouse and other tools that write temp files from outside the repo (cwd = `/tmp`).
