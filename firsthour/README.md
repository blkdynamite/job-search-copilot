# FirstHour

A recruiter-grade job-search **agent** for the web — the `job-search-copilot` skill turned into a
hosted product. It reads your resume, hunts fresh postings before the swarm, triages them honestly
(Strong / Stretch / Skip), and tailors a resume per role. Its core rule: **never invent anything —
every line must survive an interview.**

> Built as a subdirectory of the skill repo (monorepo). The agent's behavior is the skill
> (`../skills/job-search-copilot/SKILL.md`) is the source of truth; this app embeds it as the
> system prompt with production deltas.

## Status — v1, in progress

This is the first vertical slice (build-order steps 1–2 of `PLAN`): scaffold + schema + the
streaming chat agent. Landing page, chat UI (with the phase rail), the server-side `/api/chat`
route, the system prompt, and the Supabase schema are in place. **Not yet built:** magic-link auth,
resume upload + text extraction, the docx/pdf pipeline, the shared jobs index (SerpAPI/ATS), the
tailor + credits flow, cover-letter intake endpoint, and cron/digests.

## Stack

- **Next.js 14 (App Router) + TypeScript** on Vercel
- **Supabase** — Postgres + RLS, magic-link auth, Storage (planned)
- **Anthropic API** — Sonnet tier for conversation/analysis/tailoring, Haiku for triage/parsing
  (model IDs are env-driven, see `.env.example`)
- **Tailwind** for the design system (FirstHour palette + Sora / IBM Plex)

## Architecture notes

- **The Anthropic key is server-side only.** All model calls go through route handlers
  (`app/api/chat/route.ts`); the browser never sees the key. (The original prototype called the API
  directly from the client — that pattern is intentionally not shipped.)
- **System prompt** lives in `lib/systemPrompt.ts` — the skill's workflow with all **9 honesty
  rules** and production deltas (files via tools, autonomous job discovery, intake-driven cover
  letters). Prompt caching (`cache_control`) is applied to it.
- **Job discovery is autonomous.** In this first slice the agent uses the hosted `web_search` tool
  (as the prototype did); the production shared-index pipeline (SerpAPI/ATS → `jobs` table) replaces
  it in a later step without changing the prompt. Users may also paste links as an extra input.
- **Data model** in `supabase/migrations/0001_init.sql`. RLS is on for every user-owned table; the
  shared `jobs` / `search_cache` tables are written by the service role only.
- **Schema isolation.** FirstHour reuses the existing **Dap_app** Supabase project
  (`obpbpffietooawdizree`) but lives entirely in its own **`firsthour` schema**, with every table
  **`firsthour_`-prefixed** — it never creates tables in `public` or touches another app's prod
  tables. The Supabase clients (`lib/supabase/`) set `db.schema = "firsthour"`, so `.from("firsthour_jobs")`
  resolves to `firsthour.firsthour_jobs`. Auth (`auth.users`) is shared project-wide, so instead of a
  signup trigger we provision FirstHour rows lazily in-app (`lib/supabase/provisionUser.ts`).

## Local dev

```bash
cp .env.example .env.local   # fill in ANTHROPIC_API_KEY at minimum
npm install
npm run dev                  # http://localhost:3000  (chat at /chat)
```

`npm run typecheck` runs `tsc --noEmit`. The Supabase migration applies with the Supabase CLI
(`supabase db push`) or by pasting the SQL into the SQL editor.

## What maps to the skill

| Skill phase | FirstHour |
|---|---|
| Recruiter analysis | Phase 1 in chat |
| Master resume | "Resume template" (Phase 2), docx+pdf via pipeline (planned) |
| Fresh-job queries | Phase 3 — **agent hunts autonomously** (no manual Google queries) |
| Triage + tailored resume + tracker | Phase 4 + `matches`/`applications` tables |
| Cover letters (intake-driven) | `/api/cover-letter` (planned) |
| Proof of Work (Phase 5) | **deferred to v2** (`applications.proof_of_work` column reserved) |
