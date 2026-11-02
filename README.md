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

## Launch (done 2026-11-02)
- `noindex` removed from the pages and from `root-site/index.html`; root site republished.
- Lighthouse asserts the full SEO category again (≥ 0.9).
- Manual checks: Google Rich Results Test (JSON-LD `Person`), LinkedIn Post Inspector (preview card).

## Develop
```bash
npm ci
npm run dev        # http://localhost:4321/portfolio/
npm run build      # astro check + build
npm run forbidden  # guard
npm run cv         # rebuild both CV PDFs from src/data (uv + ReportLab)
npm run og         # rebuild link-preview images (uv + Pillow)
bash scripts/snapshot.sh  # on the server: dated numbers from jev, GitHub PRs, platform
bash scripts/publish-root-site.sh [--push]  # root-site/ → vitalikryzhenkous.github.io (robots.txt, llms.txt, redirect)
```
