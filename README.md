# portfolio — персональный сайт-портфолио (Astro + React): кейсы, HTML- и PDF-резюме, для работодателей

**Status:** working — 2026-11-09

Live: https://vitalikryzhenkous.github.io/portfolio/
Stack: Astro + React islands, MDX для кейсов, TypeScript strict; точные версии пакетов, Node закреплён в `.node-version`.

## Run
```bash
npm ci
npm run dev        # http://localhost:4321/portfolio/
npm run build      # astro check + build
```
Остальные команды:
```bash
npm run forbidden  # guard: scripts/forbidden.sh
npm run cv         # uv run scripts/build-cv.py
npm run og         # preview-картинки (uv + Pillow)
bash scripts/snapshot.sh                    # на сервере: датированные числа в data/snapshots/
bash scripts/publish-root-site.sh [--push]  # root-site/ -> репозиторий <user>.github.io
```
`npm run cv` собирает два PDF, но в git лежит один: Applied AI / FDE — `public/cv/` (отслеживается, публикуется на сайте). Full-Stack PDF пишется в `private/cv/` (в `.gitignore`, не публикуется). В `src/data/cv-variants.json` два варианта: `applied-ai`, `full-stack` (проверено по `scripts/build-cv.py` и `git ls-files`, 2026-11-09).

## Test
```bash
npm run test:a11y   # Playwright + axe-core, tests/a11y.spec.ts (5 тестов, статически)
```
Требует браузер и запущенный сайт; не запускалось (2026-11-09). CI (`deploy.yml`): последние 5 запусков success, 2026-11-06..2026-11-07 (facts.yaml).

## Layout
- `src/` — страницы (`src/pages/work/*.mdx`), компоненты, данные (`src/data/`)
- `data/snapshots/` — датированные снимки чисел; `data/handoff/` — заметки передачи
- `scripts/` — сборка CV/OG, `forbidden.sh`, `snapshot.sh`, публикация root-site
- `root-site/` — корневой сайт (robots.txt, llms.txt, redirect)
- `tests/` — Playwright a11y
- `private/` — gitignored, вход, который не публикуется

## Rules
- Каждое число на сайте берётся из датированного снимка в `data/snapshots/` с источником; нет данных — «TBD».
- Ничего приватного не уезжает: `scripts/forbidden.sh` гоняется по исходникам и по собранному сайту в CI до деплоя, плюс gitleaks по всей истории.

## AI parts
- Skills: нет
- Hooks: нет (`.claude/settings.json` — только правила доступа)
- Agents: нет

## State
- Текущая задача: STATE.md в репозитории нет
- Статус и соседние проекты: `~/apps/_inventory/facts.md`
- Связи с другими системами: `~/apps/agent-wiki/systems.md`

Не проверено: текст PDF (pdftotext недоступен); `private/` не читался.
