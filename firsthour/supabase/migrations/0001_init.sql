-- FirstHour — initial schema
-- Data model per the approved build plan. Repo-aligned adjustments vs. the tech spec:
--   * cover_letters table added (intake-driven; draft | outline_only for no-AI postings)
--   * applications gains cover_letter_id + proof_of_work (v2 placeholder, keeps skill's tracker schema)
--   * conversations.phase = "furthest phase reached" (side-branches allowed, not a hard linear gate)
-- Row Level Security is ON for every user-owned table (user_id = auth.uid()).

-- ── Extensions ───────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ── Enums ────────────────────────────────────────────────────
do $$ begin
  create type resume_kind      as enum ('uploaded', 'template', 'tailored');
  create type job_source       as enum ('serp', 'greenhouse', 'lever', 'ashby', 'pasted');
  create type job_status       as enum ('open', 'closed', 'unknown', 'expired');
  create type match_verdict    as enum ('strong', 'stretch', 'skip');
  create type application_status as enum ('to_apply', 'applied', 'interviewing', 'offer', 'rejected', 'ghosted');
  create type cover_letter_mode as enum ('draft', 'outline_only');
exception when duplicate_object then null; end $$;

-- ── users (mirrors auth.users; app-level fields) ─────────────
create table if not exists public.users (
  id             uuid primary key references auth.users (id) on delete cascade,
  email          text,
  plan           text not null default 'free',
  tailor_credits int  not null default 3,
  created_at     timestamptz not null default now()
);

-- ── profiles ─────────────────────────────────────────────────
create table if not exists public.profiles (
  user_id        uuid primary key references public.users (id) on delete cascade,
  full_name      text,
  city_metro     text,                    -- never store street address (stripped on ingest)
  salary_min     int,
  salary_max     int,
  remote_pref    text,
  work_auth      text,
  target_titles  jsonb not null default '[]'::jsonb,
  ats_keywords   jsonb not null default '[]'::jsonb,
  undersold_notes text,
  updated_at     timestamptz not null default now()
);

-- ── resumes ──────────────────────────────────────────────────
create table if not exists public.resumes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users (id) on delete cascade,
  kind         resume_kind not null,
  job_id       uuid,                       -- fk added after jobs table exists
  docx_path    text,
  pdf_path     text,
  content_json jsonb,                       -- canonical structured content (builder schema)
  created_at   timestamptz not null default now()
);

-- ── jobs (SHARED index — user-agnostic facts; no RLS) ────────
create table if not exists public.jobs (
  id               uuid primary key default gen_random_uuid(),
  source           job_source not null,
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
  status           job_status not null default 'unknown',
  last_verified_at timestamptz
);
create index if not exists jobs_canonical_title_idx on public.jobs (canonical_title);
create index if not exists jobs_first_seen_idx on public.jobs (first_seen_at desc);

-- resumes.job_id references jobs
do $$ begin
  alter table public.resumes
    add constraint resumes_job_id_fkey foreign key (job_id) references public.jobs (id) on delete set null;
exception when duplicate_object then null; end $$;

-- ── matches (per-user verdicts over shared jobs) ─────────────
create table if not exists public.matches (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users (id) on delete cascade,
  job_id        uuid not null references public.jobs (id) on delete cascade,
  verdict       match_verdict not null,
  verdict_reason text,
  gaps          jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now(),
  unique (user_id, job_id)
);

-- ── cover_letters (intake-driven; repo-aligned) ──────────────
create table if not exists public.cover_letters (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users (id) on delete cascade,
  job_id      uuid references public.jobs (id) on delete set null,
  mode        cover_letter_mode not null default 'draft',
  body        text,
  intake_json jsonb,                        -- the user's real experience/impact/motivation
  created_at  timestamptz not null default now()
);

-- ── applications (the tracker) ───────────────────────────────
create table if not exists public.applications (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users (id) on delete cascade,
  job_id          uuid not null references public.jobs (id) on delete cascade,
  status          application_status not null default 'to_apply',
  resume_id       uuid references public.resumes (id) on delete set null,
  cover_letter_id uuid references public.cover_letters (id) on delete set null,
  proof_of_work   text,                     -- v2 placeholder; keeps skill's tracker schema
  notes           text,
  updated_at      timestamptz not null default now(),
  unique (user_id, job_id)
);

-- ── conversations (agent memory) ─────────────────────────────
create table if not exists public.conversations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users (id) on delete cascade,
  messages   jsonb not null default '[]'::jsonb,
  phase      int not null default 0,        -- furthest phase reached; side-branches allowed
  updated_at timestamptz not null default now()
);

-- ── events (analytics) ───────────────────────────────────────
create table if not exists public.events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.users (id) on delete cascade,
  name       text not null,
  props      jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ── Shared search cache (user-agnostic; no RLS) ──────────────
create table if not exists public.search_cache (
  id              uuid primary key default gen_random_uuid(),
  canonical_title text not null,
  location_bucket text not null,
  query_hash      text,
  fetched_at      timestamptz not null default now(),
  result_count    int not null default 0,
  unique (canonical_title, location_bucket)
);

create table if not exists public.title_aliases (
  alias           text primary key,
  canonical_title text not null
);

-- ── Row Level Security ───────────────────────────────────────
-- Shared, user-agnostic tables (jobs, search_cache, title_aliases) are written only by
-- the service role (server) and are NOT exposed to anon/authenticated clients directly.
alter table public.users         enable row level security;
alter table public.profiles      enable row level security;
alter table public.resumes       enable row level security;
alter table public.matches       enable row level security;
alter table public.cover_letters enable row level security;
alter table public.applications  enable row level security;
alter table public.conversations enable row level security;
alter table public.events        enable row level security;

-- users: a row is self-owned via id = auth.uid()
do $$ begin
  create policy users_self on public.users
    for all using (id = auth.uid()) with check (id = auth.uid());
exception when duplicate_object then null; end $$;

-- Everything else: owned via user_id = auth.uid()
do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'resumes', 'matches', 'cover_letters',
    'applications', 'conversations', 'events'
  ] loop
    execute format(
      'create policy %1$s_owner on public.%1$s for all using (user_id = auth.uid()) with check (user_id = auth.uid());',
      t
    );
  end loop;
exception when duplicate_object then null; end $$;

-- ── Auto-provision a public.users row on signup ──────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  insert into public.profiles (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

do $$ begin
  create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();
exception when duplicate_object then null; end $$;
