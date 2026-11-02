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

## Launch checklist
- Remove `noindex` in `src/layouts/Base.astro` and `public/robots.txt`.
- In `lighthouserc.json` replace the individual SEO audits with `"categories:seo": ["error", {"minScore": 0.9}]`
  (the category score is ~0.63 while `noindex` is on, by design).
- Check a page in Google Rich Results Test and LinkedIn Post Inspector.

## Develop
```bash
npm ci
npm run dev        # http://localhost:4321/portfolio/
npm run build      # astro check + build
npm run forbidden  # guard
npm run cv         # rebuild both CV PDFs from src/data (uv + ReportLab)
npm run og         # rebuild link-preview images (uv + Pillow)
bash scripts/snapshot.sh  # on the server: dated numbers from jev, GitHub PRs, platform
```
