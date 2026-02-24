-- Supabase schema for AntiDOPE
-- Run in Supabase SQL Editor

create table if not exists public.athletes (
  id text primary key,
  user_id uuid not null,
  name text not null,
  sport text,
  age integer check (age is null or age >= 0),
  gender text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  athlete_id text not null references public.athletes(id) on delete cascade,
  user_id uuid not null,
  efficiency_score double precision,
  recovery_score double precision,
  consistency_score double precision,
  final_risk_score double precision,
  risk_level text,
  confidence double precision,
  feature_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists athletes_user_id_idx on public.athletes(user_id);
create index if not exists athletes_created_at_idx on public.athletes(created_at desc);

create index if not exists reports_user_id_idx on public.reports(user_id);
create index if not exists reports_athlete_id_idx on public.reports(athlete_id);
create index if not exists reports_created_at_idx on public.reports(created_at desc);

alter table public.athletes enable row level security;
alter table public.reports enable row level security;

-- athletes policies: only owner can read/write
create policy "athletes_select_own"
  on public.athletes
  for select
  using (user_id = auth.uid());

create policy "athletes_insert_own"
  on public.athletes
  for insert
  with check (user_id = auth.uid());

create policy "athletes_update_own"
  on public.athletes
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "athletes_delete_own"
  on public.athletes
  for delete
  using (user_id = auth.uid());

-- reports policies: only owner can read/write
create policy "reports_select_own"
  on public.reports
  for select
  using (user_id = auth.uid());

create policy "reports_insert_own"
  on public.reports
  for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.athletes a
      where a.id = athlete_id
        and a.user_id = auth.uid()
    )
  );

create policy "reports_update_own"
  on public.reports
  for update
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.athletes a
      where a.id = athlete_id
        and a.user_id = auth.uid()
    )
  );

create policy "reports_delete_own"
  on public.reports
  for delete
  using (user_id = auth.uid());
