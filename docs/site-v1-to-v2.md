# Portfolio site — v1 → v2

Repo: `~/apps/portfolio` (M920q). Live: https://vitalikryzhenkous.github.io/portfolio/
Status: APPROVED 2026-11-17 except one open item: years (8+ vs 9+) `[?]`

Legend: **v1** = live now · **v2** = text to apply (English, ready to paste)

---

## 1. Home — Hero

| | v1 | v2 |
|---|---|---|
| Title | Applied AI / Forward Deployed Engineer | **Full-Stack Engineer · Applied AI** |
| Years | 9+ years full-stack | **8+ years** (matches CV) `[?]` |
| Line 2 | Poznań, remote B2B, ex-B2B sales | Poznań, Poland · remote, B2B · ex-B2B sales |
| Proof line | — | **8+ yrs Angular/React/.NET/Node · LLM features in production · own agent platform** |

---

## 2. Home — Applied AI at work (Creatio)

Keep. Polish only:
- Metric unified with CV: **"cut persistent agent context by ~75% (2,199 → 506 tokens)"**.
- Three OSS examples: one sentence each.

## 3. Home — In front of customers

Keep as is.

---

## 4. Home — Selected work

| v1 | v2 |
|---|---|
| jev — privacy-first LLM router | keep |
| Agent platform with independent verifier | rewrite → "Agent platform: risk-tiered pipeline — executor, independent verifier, clean-context reviewer, supervisor role; small changes skip heavy review" |
| babyloop (private) | one combined line (below) |
| Uptime (private) | one combined line (below) |
| Interview prep as code (private) | **remove** |
| connectiq-watchface-kit (OSS) | keep |
| donecheck (in progress) | **remove** |
| — | **add: prompt-kit** (OSS, v0.2.0) — cross-platform Starship prompt with an AI-agent context gauge (tokens left before compact), installed via a Claude Code skill. github.com/vitalikryzhenkous/prompt-kit |
| — | **add: git-guard** — shared leak-protection layer for all repos: global git hooks, secret and company-name scanning before every commit. |
| — | **add: job-radar** — open job scanner for PL/EU developers (Apache-2.0); privacy-first: stores only the source link + structured score, job text deleted after each scan. (link only if repo is public at apply time, else "source on request") |
| — | **add: agent-memory (in progress)** — RAG over project logs + Notion, weekly distill into CLAUDE.md `## Rules`, evals. |

Private line (v2):
> *Also running privately: babyloop (mobile app built by an agent team) and Uptime (status board for coding agents).*

---

## 5. Home — Certifications (v2)

- DeepLearning.AI — **Agentic AI** — [certificate](https://www.deeplearning.ai/certificates/74538a5b-8b05-426a-8823-4dc6eaf47685) ← new
- DeepLearning.AI — Spec-Driven Development with Coding Agents
- Anthropic Academy — **8 badges**: Claude 101 · Claude Code 101 · Claude Platform 101 · Claude Code in Action · Introduction to Model Context Protocol · AI Fluency: Framework and Foundations · Introduction to Subagents · Introduction to Agent Skills

---

## 6. Home — Learning next (v2)

Replace the whole list with:
- DeepLearning.AI — Evaluating and Improving Agentic Applications
- master.dev — AI Engineering course
- DeepLearning.AI — Machine Learning in Production
- Fine-tuning a 0.5–1.5B classifier for jev (LoRA)

Dropped: Claude Certified Architect (needs partner access, no date) · "public RAG project" (now agent-memory in Selected work). No dates on the list.

---

## 7. How I work — structure

v1: 3 layers, verifier described 3 times.
v2: intro → pipeline → five rules → what runs today → footer.

### 7.1 Intro
> I run coding agents on my own home server under written rules. Risky changes pass an independent verifier and a clean-context reviewer; routine changes skip them. Private data never leaves the tailnet.

### 7.2 The pipeline
1. **Task** — Notion Uptime Tasks board; I set priority, the supervisor picks the next task.
2. **Rules** — conventions, permissions (agent alone / asks / human only) and runbooks live in a git wiki; changes via PR.
3. **Executor** — `/make`: intent → procedure → plan → change. Model picked per risk tier.
4. **Checks** — risk-tiered: small changes → verify script + CI → auto-merge; system changes → verifier GO/STOP before, PASS/FAIL after, clean-context review before merge.
5. **Memory** — every session logged (metadata only). A weekly job distills decisions/errors into `## Rules`; agent-memory RAG answers "why".

### 7.3 Five rules
- A check that cannot run is a failure.
- Two human gates: spec and merge (merge is automatic when CI + checks pass; I review ~every 5th PR or anything critical).
- Agents commit to branches; merge, admin, secrets — human only.
- Hooks log metadata, never prompts or file contents.
- Nothing is reachable from the internet; all access via Tailscale.

### 7.4 What runs today
- **Machine:** M920q, WSL2, one tmux session per project (Claude Code). Laptop is a thin client. Phone via SSH + tmux.
- **Control:** Stream Deck+ → own deck-server (session per key).
- **Guard:** git-guard — global git hooks, secret and leak scan on every commit, all repos.
- **Local models:** jev API (OpenAI-compatible router) + Ollama on CPU for sensitive requests.
- **Records:** Notion (what & why), GitHub PRs (how), one JSON line per routed request with a canary test.
- **Backup:** nightly restic to a local disk, restore-tested.

Dropped from v1: six-shell-checks list, jev console, device-by-device breakdown.

---

## 8. Apply

Handoff prompt: `portfolio/handoff-v2.md`. Launch from `~/apps/portfolio` on the M920q.
