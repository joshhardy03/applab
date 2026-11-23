-- CI: checks the access rules in schema.sql. Any failed check raises and stops psql.
\set ON_ERROR_STOP on

insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'),
  ('00000000-0000-0000-0000-00000000000b'),
  ('00000000-0000-0000-0000-00000000000c');

create or replace function pg_temp.as_user(u text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', u, false)
$$;
create or replace function pg_temp.check(ok boolean, what text) returns void language plpgsql as $$
begin
  if not coalesce(ok, false) then raise exception 'CHECK FAILED: %', what; end if;
  raise notice 'ok: %', what;
end $$;
grant execute on all functions in schema pg_temp to authenticated, anon;

set role authenticated;

-- A makes a group; B joins it with the code; C stays outside.
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.profiles (id, display_name) values (auth.uid(), 'Alice');
create temp table code_holder as select invite_code from public.create_group('Family') ;
select pg_temp.check((select length(invite_code) = 8 from code_holder), 'invite code is 8 characters');
insert into public.results (game, number, day, won, score, points) values ('wordle', 1983, '2026-11-23', true, 3, 4);

select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
insert into public.profiles (id, display_name) values (auth.uid(), 'Bob');
select pg_temp.check((select name = 'Family' and member_count = 1 from public.group_preview((select lower(invite_code) from code_holder))), 'preview by code (any case)');
select public.join_group((select invite_code from code_holder));
select public.join_group((select invite_code from code_holder)); -- joining twice is harmless
insert into public.results (game, number, day, won, score, points) values ('wordle', 1983, '2026-11-23', true, 5, 2);

select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
insert into public.profiles (id, display_name) values (auth.uid(), 'Cara');
insert into public.results (game, number, day, won, score, points) values ('wordle', 1983, '2026-11-23', true, 2, 5);

-- Visibility
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select pg_temp.check((select count(*) = 2 from public.results), 'B sees A and B results, not C');
select pg_temp.check((select count(*) = 2 from public.profiles), 'B sees A and B profiles');
select pg_temp.check((select count(*) = 1 from public.groups), 'B sees the shared group');
select pg_temp.check((select count(*) = 2 from public.group_members), 'B sees both members');

select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select pg_temp.check((select count(*) = 1 from public.results), 'C sees only own results');
select pg_temp.check((select count(*) = 1 from public.profiles), 'C sees only own profile');
select pg_temp.check((select count(*) = 0 from public.groups), 'C sees no groups');
select pg_temp.check((select count(*) = 3 from public.global_leaderboard('2026-11-23', '2026-11-23')), 'global board lists all three');
select pg_temp.check((select display_name = 'Cara' and is_me from public.global_leaderboard('2026-11-23', '2026-11-23') limit 1), 'global board sorted by points, marks me');

-- Writes are limited to your own rows
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
do $$ begin
  insert into public.results (user_id, game, number, day, won, score, points)
    values ('00000000-0000-0000-0000-00000000000a', 'wordle', 1982, '2026-11-22', true, 1, 6);
  raise exception 'CHECK FAILED: B wrote a result as A';
exception when insufficient_privilege or check_violation then raise notice 'ok: B cannot write as A';
end $$;
update public.results set points = 6 where user_id = '00000000-0000-0000-0000-00000000000a';
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select pg_temp.check((select points = 4 from public.results where user_id = auth.uid()), 'B could not change A''s result');
do $$ begin
  insert into public.results (game, number, day, won, score, points) values ('wordle', 1, '2021-06-20', true, 1, 60);
  raise exception 'CHECK FAILED: impossible points accepted';
exception when check_violation then raise notice 'ok: points capped';
end $$;
do $$ begin
  insert into public.group_members (group_id, user_id)
    select id, '00000000-0000-0000-0000-00000000000c' from public.groups limit 1;
  raise exception 'CHECK FAILED: A added C to a group directly';
exception when insufficient_privilege then raise notice 'ok: memberships only via join_group';
end $$;

-- Leaving a group hides results again
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
delete from public.group_members where user_id = auth.uid();
select pg_temp.check((select count(*) = 1 from public.results), 'after leaving, B sees only own results');

-- Not signed in: nothing
select pg_temp.as_user('');
select pg_temp.check((select count(*) = 0 from public.global_leaderboard('2026-11-23', '2026-11-23')), 'no user, no leaderboard');
do $$ begin
  perform public.create_group('x');
  raise exception 'CHECK FAILED: created a group without a user';
exception when raise_exception then
  if sqlerrm like 'CHECK FAILED%' then raise; end if;
  raise notice 'ok: must be signed in to create a group';
end $$;

reset role;
set role anon;
do $$ begin
  perform 1 from public.results;
  raise exception 'CHECK FAILED: anon read results';
exception when insufficient_privilege then raise notice 'ok: anon has no access';
end $$;
reset role;

-- Account deletion removes everything of C's
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select public.delete_my_account();
reset role;
select pg_temp.check((select count(*) = 0 from public.results where user_id = '00000000-0000-0000-0000-00000000000c'), 'deleted account leaves no results');
select pg_temp.check((select count(*) = 0 from public.profiles where id = '00000000-0000-0000-0000-00000000000c'), 'deleted account leaves no profile');

-- A group survives its creator deleting their account if others are still in it
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select public.join_group((select invite_code from code_holder));
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select public.delete_my_account();
reset role;
select pg_temp.check((select count(*) = 1 from public.groups), 'group kept after its creator left');
select pg_temp.check((select count(*) = 1 from public.group_members), 'remaining member still in it');

select 'ALL CHECKS PASSED';
