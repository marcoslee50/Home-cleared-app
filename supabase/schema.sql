-- ============================================================
-- Lifetold — Supabase Schema
-- Run this in the Supabase SQL editor for your project
-- ============================================================

-- ── Jobs table ────────────────────────────────────────────────
create table if not exists tribute_jobs (
  id              text primary key,
  stage           text not null default 'created'
                  check (stage in ('created','uploading','voice_analysis',
                                   'narrative','portrait','video',
                                   'finalising','done','error')),
  stage_progress  integer not null default 0 check (stage_progress between 0 and 100),
  meta            jsonb not null default '{}',
  photo_urls      text[] default array[]::text[],
  video_urls      text[] default array[]::text[],
  voice_urls      text[] default array[]::text[],
  video_url       text,
  narrative       text,
  voice_id        text,
  did_job_id      text,
  message         text,
  share_token     text unique default gen_random_uuid()::text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table tribute_jobs is 'Tracks the state of each tribute generation job';
comment on column tribute_jobs.meta is 'Person details + interview answers + style choices';
comment on column tribute_jobs.share_token is 'Public share URL token — UUID, not the job ID';

-- ── Auto-update updated_at ────────────────────────────────────
create or replace function update_updated_at_column()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tribute_jobs_updated_at on tribute_jobs;
create trigger tribute_jobs_updated_at
  before update on tribute_jobs
  for each row execute function update_updated_at_column();

-- ── Indexes ───────────────────────────────────────────────────
create index if not exists idx_tribute_jobs_stage
  on tribute_jobs(stage);

create index if not exists idx_tribute_jobs_share_token
  on tribute_jobs(share_token);

create index if not exists idx_tribute_jobs_created_at
  on tribute_jobs(created_at desc);

-- ── Row Level Security ────────────────────────────────────────
alter table tribute_jobs enable row level security;

-- Backend (service role) can do everything
-- The backend uses the service key, which bypasses RLS by default.
-- If you're using the anon key anywhere, add explicit policies.

-- Allow anyone to read by share_token (for the public share page)
create policy "Public read via share_token" on tribute_jobs
  for select
  using (share_token is not null);

-- ── Verify ────────────────────────────────────────────────────
do $$
begin
  assert (select count(*) from information_schema.tables
          where table_name = 'tribute_jobs') > 0,
    'tribute_jobs table not created';
  raise notice 'Lifetold schema applied successfully';
end $$;
