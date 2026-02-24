-- Supabase schema for AntiDOPE
-- Run in Supabase SQL Editor

create extension if not exists pgcrypto;

create table if not exists public.athletes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  sport text,
  age integer check (age is null or age >= 0),
  gender text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  user_id uuid not null,
  efficiency_score double precision,
  recovery_score double precision,
  consistency_score double precision,
  final_risk_score double precision,
  risk_level text,
  confidence double precision,
  feature_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_profiles (
  user_id uuid primary key,
  full_name text,
  role text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.athletes add column if not exists updated_at timestamptz not null default timezone('utc', now());
alter table public.reports add column if not exists updated_at timestamptz not null default timezone('utc', now());
alter table public.user_profiles add column if not exists created_at timestamptz not null default timezone('utc', now());
alter table public.user_profiles add column if not exists updated_at timestamptz not null default timezone('utc', now());

do $$
declare
  athletes_id_is_text boolean;
  reports_athlete_id_is_text boolean;
begin
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'athletes'
      and column_name = 'id'
      and data_type in ('text', 'character varying')
  ) into athletes_id_is_text;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'reports'
      and column_name = 'athlete_id'
      and data_type in ('text', 'character varying')
  ) into reports_athlete_id_is_text;

  if athletes_id_is_text then
    alter table public.athletes add column if not exists legacy_id text;
    update public.athletes set legacy_id = id where legacy_id is null;
    alter table public.athletes alter column id drop default;
    alter table public.athletes alter column id type uuid
      using (
        case
          when legacy_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then legacy_id::uuid
          else gen_random_uuid()
        end
      );
    alter table public.athletes alter column id set default gen_random_uuid();
  end if;

  if reports_athlete_id_is_text then
    alter table public.reports drop constraint if exists reports_athlete_id_fkey;
    alter table public.reports add column if not exists athlete_id_uuid uuid;

    update public.reports r
    set athlete_id_uuid = a.id
    from public.athletes a
    where a.legacy_id = r.athlete_id;

    delete from public.reports where athlete_id_uuid is null;

    alter table public.reports drop column athlete_id;
    alter table public.reports rename column athlete_id_uuid to athlete_id;
    alter table public.reports alter column athlete_id set not null;
    alter table public.reports
      add constraint reports_athlete_id_fkey
      foreign key (athlete_id) references public.athletes(id) on delete cascade;
  end if;
end $$;

create index if not exists athletes_user_id_idx on public.athletes(user_id);
create index if not exists athletes_created_at_idx on public.athletes(created_at desc);

create index if not exists reports_user_id_idx on public.reports(user_id);
create index if not exists reports_athlete_id_idx on public.reports(athlete_id);
create index if not exists reports_created_at_idx on public.reports(created_at desc);
create index if not exists user_profiles_updated_at_idx on public.user_profiles(updated_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_athletes_updated_at on public.athletes;
create trigger set_athletes_updated_at
before update on public.athletes
for each row execute function public.set_updated_at();

drop trigger if exists set_reports_updated_at on public.reports;
create trigger set_reports_updated_at
before update on public.reports
for each row execute function public.set_updated_at();

drop trigger if exists set_user_profiles_updated_at on public.user_profiles;
create trigger set_user_profiles_updated_at
before update on public.user_profiles
for each row execute function public.set_updated_at();

alter table public.athletes enable row level security;
alter table public.reports enable row level security;
alter table public.user_profiles enable row level security;

drop policy if exists "athletes_select_own" on public.athletes;
drop policy if exists "athletes_insert_own" on public.athletes;
drop policy if exists "athletes_update_own" on public.athletes;
drop policy if exists "athletes_delete_own" on public.athletes;

drop policy if exists "reports_select_own" on public.reports;
drop policy if exists "reports_insert_own" on public.reports;
drop policy if exists "reports_update_own" on public.reports;
drop policy if exists "reports_delete_own" on public.reports;

drop policy if exists "user_profiles_select_own" on public.user_profiles;
drop policy if exists "user_profiles_insert_own" on public.user_profiles;
drop policy if exists "user_profiles_update_own" on public.user_profiles;
drop policy if exists "user_profiles_delete_own" on public.user_profiles;

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

-- user profile policies: only owner can read/write
create policy "user_profiles_select_own"
  on public.user_profiles
  for select
  using (user_id = auth.uid());

create policy "user_profiles_insert_own"
  on public.user_profiles
  for insert
  with check (user_id = auth.uid());

create policy "user_profiles_update_own"
  on public.user_profiles
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "user_profiles_delete_own"
  on public.user_profiles
  for delete
  using (user_id = auth.uid());
