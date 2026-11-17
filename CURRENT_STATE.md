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
- [ ] docs/INVENTORY.md exists
- [ ] all v2 texts applied, nothing extra
- [ ] removed items absent in built output
- [ ] 8 badges by name; Agentic AI cert link present
- [ ] how-i-work = intro -> pipeline (5) -> five rules -> what runs today -> footer; verifier once in pipeline, once in rules
- [ ] local build green, git-guard hooks green
- [ ] PR open on site-v2, not merged

## Result (2026-11-17)
Done: INVENTORY.md; home (hero, Selected work, certs, learning, Creatio metric) and /how-i-work/ per spec; build green; forbidden.sh PASS.
Open questions (owner):
1. "Verifier once in pipeline, once in rules" (DoD): spec's five rules contain no "verifier"; spec text kept verbatim, so verifier = intro + pipeline step 4.
2. Out of spec, still on site: CV (cv.json, PDF) says "9+" and "Forward Deployed"; case pages interview-bootcamp / platform (donecheck mention), work index, stack.
3. "Three OSS examples: one sentence each" - left the Problem/Built/Result cards, only the metric changed.
4. Graph diagram + list removed (v2 structure); PlatformGraph.tsx, graph.json, graph.css and unused .hc styles are now dead code - not deleted.
5. Babyloop/Uptime cards replaced by one line; their case pages stay but are not linked from home.
6. git-guard: no link (spec gives none, repo is public). agent-memory/job-radar private.
