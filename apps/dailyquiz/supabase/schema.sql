-- Daily Quiz Tracker: Supabase schema (Postgres). Run once in the Supabase SQL editor.
-- Safe to re-run: it drops and recreates only this app's functions and policies.
--
-- Who can see what (enforced by row-level security, not by the app):
--   • your own profile and results: you
--   • profiles and results of people who share a group with you: you
--   • groups and members: only the groups you're in
--   • the global leaderboard: everyone signed in sees display names and day totals only
-- Writes to groups and memberships go through the functions below.

create extension if not exists pgcrypto;

-- ── tables ─────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 24),
  colour text not null default '#3b5bdb' check (colour ~ '^#[0-9a-fA-F]{6}$'),
  created_at timestamptz not null default now()
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 40),
  invite_code text not null unique,
  -- set null, not cascade: deleting your account must not delete a group others are in
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index if not exists group_members_user_idx on public.group_members(user_id);

create table if not exists public.results (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  game text not null check (game ~ '^[a-z]{2,20}$'),
  number integer not null check (number >= 0),
  day date not null,
  won boolean not null,
  score real not null,
  max real,
  points real not null check (points >= 0 and points <= 6),
  hard boolean,
  hints integer,
  added_at timestamptz not null default now(),
  primary key (user_id, game, number)
);
create index if not exists results_day_idx on public.results(day);

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.results enable row level security;

-- ── helpers (security definer so policies don't recurse) ────────────────────
create or replace function public.my_group_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select group_id from public.group_members where user_id = auth.uid()
$$;

create or replace function public.shares_group_with(other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.group_members a
    join public.group_members b on a.group_id = b.group_id
    where a.user_id = auth.uid() and b.user_id = other
  )
$$;

-- 8 characters from an alphabet without look-alikes (no 0/O, 1/I/L).
create or replace function public.new_invite_code() returns text
language plpgsql volatile set search_path = public, extensions as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    code := '';
    for i in 1..8 loop
      code := code || substr(alphabet, 1 + (get_byte(gen_random_bytes(1), 0) % length(alphabet)), 1);
    end loop;
    exit when not exists (select 1 from public.groups where invite_code = code);
  end loop;
  return code;
end
$$;

-- ── policies ───────────────────────────────────────────────────────────────
drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_insert on public.profiles;
drop policy if exists profiles_update on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_group_with(id));
create policy profiles_insert on public.profiles for insert to authenticated
  with check (id = auth.uid());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists groups_select on public.groups;
drop policy if exists groups_update on public.groups;
drop policy if exists groups_delete on public.groups;
create policy groups_select on public.groups for select to authenticated
  using (id in (select public.my_group_ids()));
create policy groups_update on public.groups for update to authenticated
  using (created_by = auth.uid()) with check (created_by = auth.uid());
create policy groups_delete on public.groups for delete to authenticated
  using (created_by = auth.uid());

drop policy if exists members_select on public.group_members;
drop policy if exists members_leave on public.group_members;
create policy members_select on public.group_members for select to authenticated
  using (group_id in (select public.my_group_ids()));
create policy members_leave on public.group_members for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists results_select on public.results;
drop policy if exists results_insert on public.results;
drop policy if exists results_update on public.results;
drop policy if exists results_delete on public.results;
create policy results_select on public.results for select to authenticated
  using (user_id = auth.uid() or public.shares_group_with(user_id));
create policy results_insert on public.results for insert to authenticated
  with check (user_id = auth.uid());
create policy results_update on public.results for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy results_delete on public.results for delete to authenticated
  using (user_id = auth.uid());

-- ── functions the app calls ────────────────────────────────────────────────
create or replace function public.create_group(p_name text) returns public.groups
language plpgsql security definer set search_path = public as $$
declare g public.groups;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if (select count(*) from public.groups where created_by = auth.uid()) >= 20 then
    raise exception 'group limit reached';
  end if;
  insert into public.groups (name, invite_code, created_by)
    values (btrim(p_name), public.new_invite_code(), auth.uid())
    returning * into g;
  insert into public.group_members (group_id, user_id) values (g.id, auth.uid());
  return g;
end
$$;

-- What an invite link points at, before joining: name and size only.
create or replace function public.group_preview(p_code text)
returns table (name text, member_count bigint)
language sql stable security definer set search_path = public as $$
  select g.name, (select count(*) from public.group_members m where m.group_id = g.id)
  from public.groups g where g.invite_code = upper(btrim(p_code))
$$;

create or replace function public.join_group(p_code text) returns public.groups
language plpgsql security definer set search_path = public as $$
declare g public.groups;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select * into g from public.groups where invite_code = upper(btrim(p_code));
  if g.id is null then raise exception 'invite code not found'; end if;
  if (select count(*) from public.group_members where group_id = g.id) >= 50 then
    raise exception 'group is full';
  end if;
  insert into public.group_members (group_id, user_id) values (g.id, auth.uid())
    on conflict do nothing;
  return g;
end
$$;

-- Everyone's day totals between two days (inclusive): names and totals only.
create or replace function public.global_leaderboard(p_from date, p_to date, p_limit integer default 50)
returns table (user_id uuid, display_name text, colour text, total real, games bigint, is_me boolean)
language sql stable security definer set search_path = public as $$
  select r.user_id, p.display_name, p.colour, sum(r.points)::real, count(*), r.user_id = auth.uid()
  from public.results r join public.profiles p on p.id = r.user_id
  where r.day between p_from and p_to and auth.uid() is not null
  group by r.user_id, p.display_name, p.colour
  order by sum(r.points) desc, count(*) desc
  limit least(greatest(p_limit, 1), 200)
$$;

-- In-app account deletion (store rule): removes the user and, by cascade, all their data.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from public.groups where created_by = auth.uid()
    and (select count(*) from public.group_members m where m.group_id = groups.id) <= 1;
  delete from auth.users where id = auth.uid();
end
$$;

-- Only signed-in users (including anonymous sign-ins) may call these.
revoke all on function public.my_group_ids() from public, anon;
revoke all on function public.shares_group_with(uuid) from public, anon;
revoke all on function public.new_invite_code() from public, anon, authenticated;
revoke all on function public.create_group(text) from public, anon;
revoke all on function public.group_preview(text) from public, anon;
revoke all on function public.join_group(text) from public, anon;
revoke all on function public.global_leaderboard(date, date, integer) from public, anon;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.my_group_ids() to authenticated;
grant execute on function public.shares_group_with(uuid) to authenticated;
grant execute on function public.create_group(text) to authenticated;
grant execute on function public.group_preview(text) to authenticated;
grant execute on function public.join_group(text) to authenticated;
grant execute on function public.global_leaderboard(date, date, integer) to authenticated;
grant execute on function public.delete_my_account() to authenticated;

grant select, insert, update on public.profiles to authenticated;
grant select, update, delete on public.groups to authenticated;
grant select, delete on public.group_members to authenticated;
grant select, insert, update, delete on public.results to authenticated;
revoke all on public.profiles, public.groups, public.group_members, public.results from anon;
