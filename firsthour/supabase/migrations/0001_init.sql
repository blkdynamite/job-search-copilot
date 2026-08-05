-- FirstHour — initial schema
--
-- ISOLATION: FirstHour lives in its OWN `firsthour` schema, and every table is additionally
-- prefixed `firsthour_` (standing convention: always prefix table names with the site). This app
-- shares a Supabase project (Dap_app) with other apps, so it must NEVER create tables in `public`
-- or touch another app's prod tables. All FirstHour tables → firsthour.firsthour_<name>.
--
-- AUTH is shared across the project (auth.users). We deliberately DO NOT add an on_auth_user_created
-- trigger (it would fire for every app's sign-ups). FirstHour provisions its own user/profile rows
-- lazily from the app (service-role upsert on first authenticated request) — see lib/supabase/provisionUser.ts.
--
-- Repo-aligned adjustments vs. the tech spec:
--   * cover_letters table (intake-driven; draft | outline_only for no-AI postings)
--   * applications gains cover_letter_id + proof_of_work (v2 placeholder, keeps skill's tracker schema)
--   * conversations.phase = "furthest phase reached" (side-branches allowed, not a hard linear gate)

create schema if not exists firsthour;

-- ── Enums (schema-qualified in firsthour) ────────────────────
do $$ begin
  create type firsthour.resume_kind        as enum ('uploaded', 'template', 'tailored');
  create type firsthour.job_source         as enum ('serp', 'greenhouse', 'lever', 'ashby', 'pasted');
  create type firsthour.job_status         as enum ('open', 'closed', 'unknown', 'expired');
  create type firsthour.match_verdict      as enum ('strong', 'stretch', 'skip');
  create type firsthour.application_status as enum ('to_apply', 'applied', 'interviewing', 'offer', 'rejected', 'ghosted');
  create type firsthour.cover_letter_mode  as enum ('draft', 'outline_only');
exception when duplicate_object then null; end $$;

-- ── users (mirrors auth.users; app-level fields) ─────────────
create table if not exists firsthour.firsthour_users (
  id             uuid primary key references auth.users (id) on delete cascade,
  email          text,
  plan           text not null default 'free',
  tailor_credits int  not null default 3,
  created_at     timestamptz not null default now()
);

-- ── profiles ─────────────────────────────────────────────────
create table if not exists firsthour.firsthour_profiles (
  user_id         uuid primary key references firsthour.firsthour_users (id) on delete cascade,
  full_name       text,
  city_metro      text,                   -- never store street address (stripped on ingest)
  salary_min      int,
  salary_max      int,
  remote_pref     text,
  work_auth       text,
  target_titles   jsonb not null default '[]'::jsonb,
  ats_keywords    jsonb not null default '[]'::jsonb,
  undersold_notes text,
  updated_at      timestamptz not null default now()
);

-- ── resumes ──────────────────────────────────────────────────
create table if not exists firsthour.firsthour_resumes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references firsthour.firsthour_users (id) on delete cascade,
  kind         firsthour.resume_kind not null,
  job_id       uuid,                      -- fk added after jobs table exists
  docx_path    text,
  pdf_path     text,
  content_json jsonb,                      -- canonical structured content (builder schema)
  created_at   timestamptz not null default now()
);

-- ── jobs (SHARED index — user-agnostic; service-role only) ───
create table if not exists firsthour.firsthour_jobs (
  id               uuid primary key default gen_random_uuid(),
  source           firsthour.job_source not null,
  company          text,
  title            text,
  canonical_title  text,
  location         text,
  location_bucket  text,
  url              text not null unique,
  posted_at        timestamptz,
  first_seen_at    timestamptz not null default now(),  -- freshness ground truth; never overwrite
  raw_description  text,
  ai_prohibited    boolean not null default false,       -- Haiku no-AI-policy scan result
  status           firsthour.job_status not null default 'unknown',
  last_verified_at timestamptz
);
create index if not exists firsthour_jobs_canonical_title_idx on firsthour.firsthour_jobs (canonical_title);
create index if not exists firsthour_jobs_first_seen_idx on firsthour.firsthour_jobs (first_seen_at desc);

-- resumes.job_id references jobs
do $$ begin
  alter table firsthour.firsthour_resumes
    add constraint firsthour_resumes_job_id_fkey
    foreign key (job_id) references firsthour.firsthour_jobs (id) on delete set null;
exception when duplicate_object then null; end $$;

-- ── matches (per-user verdicts over shared jobs) ─────────────
create table if not exists firsthour.firsthour_matches (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references firsthour.firsthour_users (id) on delete cascade,
  job_id         uuid not null references firsthour.firsthour_jobs (id) on delete cascade,
  verdict        firsthour.match_verdict not null,
  verdict_reason text,
  gaps           jsonb not null default '[]'::jsonb,
  created_at     timestamptz not null default now(),
  unique (user_id, job_id)
);

-- ── cover_letters (intake-driven; repo-aligned) ──────────────
create table if not exists firsthour.firsthour_cover_letters (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references firsthour.firsthour_users (id) on delete cascade,
  job_id      uuid references firsthour.firsthour_jobs (id) on delete set null,
  mode        firsthour.cover_letter_mode not null default 'draft',
  body        text,
  intake_json jsonb,                       -- the user's real experience/impact/motivation
  created_at  timestamptz not null default now()
);

-- ── applications (the tracker) ───────────────────────────────
create table if not exists firsthour.firsthour_applications (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references firsthour.firsthour_users (id) on delete cascade,
  job_id          uuid not null references firsthour.firsthour_jobs (id) on delete cascade,
  status          firsthour.application_status not null default 'to_apply',
  resume_id       uuid references firsthour.firsthour_resumes (id) on delete set null,
  cover_letter_id uuid references firsthour.firsthour_cover_letters (id) on delete set null,
  proof_of_work   text,                    -- v2 placeholder; keeps skill's tracker schema
  notes           text,
  updated_at      timestamptz not null default now(),
  unique (user_id, job_id)
);

-- ── conversations (agent memory) ─────────────────────────────
create table if not exists firsthour.firsthour_conversations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references firsthour.firsthour_users (id) on delete cascade,
  messages   jsonb not null default '[]'::jsonb,
  phase      int not null default 0,       -- furthest phase reached; side-branches allowed
  updated_at timestamptz not null default now()
);

-- ── events (analytics) ───────────────────────────────────────
create table if not exists firsthour.firsthour_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references firsthour.firsthour_users (id) on delete cascade,
  name       text not null,
  props      jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ── Shared search cache (user-agnostic; service-role only) ───
create table if not exists firsthour.firsthour_search_cache (
  id              uuid primary key default gen_random_uuid(),
  canonical_title text not null,
  location_bucket text not null,
  query_hash      text,
  fetched_at      timestamptz not null default now(),
  result_count    int not null default 0,
  unique (canonical_title, location_bucket)
);

create table if not exists firsthour.firsthour_title_aliases (
  alias           text primary key,
  canonical_title text not null
);

-- ── Row Level Security ───────────────────────────────────────
-- User-owned tables: owner-only. Shared tables (jobs, search_cache, title_aliases): RLS on with NO
-- policy → denied to anon/authenticated; only the service role (which bypasses RLS) reads/writes them.
alter table firsthour.firsthour_users         enable row level security;
alter table firsthour.firsthour_profiles      enable row level security;
alter table firsthour.firsthour_resumes       enable row level security;
alter table firsthour.firsthour_matches       enable row level security;
alter table firsthour.firsthour_cover_letters enable row level security;
alter table firsthour.firsthour_applications  enable row level security;
alter table firsthour.firsthour_conversations enable row level security;
alter table firsthour.firsthour_events        enable row level security;
alter table firsthour.firsthour_jobs          enable row level security;
alter table firsthour.firsthour_search_cache  enable row level security;
alter table firsthour.firsthour_title_aliases enable row level security;

-- users: self-owned via id = auth.uid()
do $$ begin
  create policy firsthour_users_self on firsthour.firsthour_users
    for all using (id = auth.uid()) with check (id = auth.uid());
exception when duplicate_object then null; end $$;

-- Everything user-owned: owned via user_id = auth.uid()
do $$
declare t text;
begin
  foreach t in array array[
    'firsthour_profiles', 'firsthour_resumes', 'firsthour_matches', 'firsthour_cover_letters',
    'firsthour_applications', 'firsthour_conversations', 'firsthour_events'
  ] loop
    execute format(
      'create policy %1$s_owner on firsthour.%1$s for all using (user_id = auth.uid()) with check (user_id = auth.uid());',
      t
    );
  end loop;
exception when duplicate_object then null; end $$;

-- ── Grants (PostgREST/supabase-js reachability; RLS still gates rows) ──
grant usage on schema firsthour to anon, authenticated, service_role;

-- user-owned tables: authenticated may operate (RLS restricts to own rows); service_role full.
grant select, insert, update, delete on
  firsthour.firsthour_users, firsthour.firsthour_profiles, firsthour.firsthour_resumes,
  firsthour.firsthour_matches, firsthour.firsthour_cover_letters, firsthour.firsthour_applications,
  firsthour.firsthour_conversations, firsthour.firsthour_events
  to authenticated;

-- shared tables: service_role only (no grant to anon/authenticated → not reachable even if exposed).
grant select, insert, update, delete on
  firsthour.firsthour_users, firsthour.firsthour_profiles, firsthour.firsthour_resumes,
  firsthour.firsthour_matches, firsthour.firsthour_cover_letters, firsthour.firsthour_applications,
  firsthour.firsthour_conversations, firsthour.firsthour_events,
  firsthour.firsthour_jobs, firsthour.firsthour_search_cache, firsthour.firsthour_title_aliases
  to service_role;

-- future tables in this schema inherit sensible defaults
alter default privileges in schema firsthour grant select, insert, update, delete on tables to service_role;
