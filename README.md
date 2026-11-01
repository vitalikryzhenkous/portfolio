# portfolio

Personal portfolio of Vitalii Ryzhenko — Applied AI / Forward Deployed Engineer.
Live: https://vitalikryzhenkous.github.io/portfolio/

## Stack
Astro + React islands, MDX for case studies, TypeScript strict. Exact package versions; Node pinned in `.node-version`.

## Rules for this repo
- Every number on the site comes from a dated snapshot in `data/snapshots/` with its source; no data → "TBD".
- Nothing private ships: `scripts/forbidden.sh` runs on the source and on the built site in CI, before deploy,
  plus a gitleaks scan of the full history. The script prints only file:line and the rule name.
- `private/` (gitignored) holds inputs that never get published.

## Develop
```bash
npm ci
npm run dev        # http://localhost:4321/portfolio/
npm run build      # astro check + build
npm run forbidden  # guard
```
