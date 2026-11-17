# CURRENT_STATE — site-v2

Spec: docs/site-v1-to-v2.md (source of truth). Base: main. Branch: site-v2.

## Decisions
- Years: 8+ (spec marks `[?]`, handoff says 8+ unless stated otherwise).
- job-radar repo is PRIVATE -> text "source on request", no link.
- Base branch = main (owner choice); #38 (feat/recruiter-friendly) untouched.

## Plan
1. Inventory (haiku) -> docs/INVENTORY.md
2. Content (sonnet): spec 1-6 home, 7 how-i-work
3. Verify: build, greps, hooks
4. Deliver: PR site-v2, not merged

## DoD
- [x] docs/INVENTORY.md exists
- [x] all v2 texts applied, nothing extra
- [x] removed items absent in built output
- [x] 8 badges by name; Agentic AI cert link present
- [x] how-i-work = intro -> pipeline (5) -> five rules -> what runs today -> footer; verifier once in pipeline, once in rules
- [x] local build green, git-guard hooks green
- [x] PR open on site-v2, not merged

## Result (2026-11-17)
Done: INVENTORY.md; home (hero, Selected work, certs, learning, Creatio metric) and /how-i-work/ per spec; build green; forbidden.sh PASS.
Open questions (owner):
1. "Verifier once in pipeline, once in rules" (DoD): spec's five rules contain no "verifier"; spec text kept verbatim, so verifier = intro + pipeline step 4.
2. Out of spec, still on site: CV (cv.json, PDF) says "9+" and "Forward Deployed"; case pages interview-bootcamp / platform (donecheck mention), work index, stack.
3. "Three OSS examples: one sentence each" - left the Problem/Built/Result cards, only the metric changed.
4. Graph diagram + list removed (v2 structure); PlatformGraph.tsx, graph.json, graph.css and unused .hc styles are now dead code - not deleted.
5. Babyloop/Uptime cards replaced by one line; their case pages stay but are not linked from home.
6. git-guard: no link (spec gives none, repo is public). agent-memory/job-radar private.

## Round 2 (owner-approved minimal replacements)
Done: "9+ years"->"8+ years", "Applied AI / Forward Deployed Engineer"->"Full-Stack Engineer · Applied AI" (cv/cv-variants/og/cv.astro/README/root-site); donecheck bullet removed; interview-bootcamp page, work card, og entry, redirect, a11y/stale.sh entries removed; dead graph code removed (PlatformGraph.tsx, graph.json, graph.css, .hc styles); babyloop/Uptime linked in the private line; forbidden.sh checks stale v1 strings over all of dist/.
Left for owner / not done:
- CV PDF (public/) not touched: owner updates from Desktop/resume.
- stack.json: project entry kept for its technologies, name shortened to "interview-bootcamp + Interview Bootcamp trainer", case link removed.
- scripts/build-graph.ts, data/graph-allowlist.json, `npm run graph` now write/read nothing used by the site: left, not asked.
- scripts/snapshot.sh still mentions interview-gym (data snapshot): untouched.
- Playwright a11y suite not run.

## Round 3
- Rebased onto main (README conflict: kept site-v2 line "Full-Stack Engineer · Applied AI"). PR #39 was already MERGED (first commit of this branch), so nothing to close.
- Removed scripts/build-graph.ts, data/graph-allowlist.json, npm script `graph`; interview-gym block removed from scripts/snapshot.sh (key `trainer` no longer in snapshots).
- stack entry heading -> "Interview bootcamps (private)".
- Playwright a11y: 21/22 pass; failing "graph is usable from the keyboard" tested the removed graph (our change) -> test deleted. Run via a temp config on port 4399 (4321 is held by another process); repo config unchanged.
- Orphan left: data/graph-scenarios.json (only consumer was build-graph.ts), not in the owner's list.
