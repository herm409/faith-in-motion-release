-- Group walks, Option 1 (progress only). Approved plan: plans/group-walks.md (Herman, 2026-10-17 6:51 PM CT).
-- ADDITIVE ONLY: two new tables, new functions, new policies. fim.items, fim.rate, fim.delete_me and
-- fim.account_status are untouched. Safe to run twice. Applied first on Neon branch steps-groups-preview, never main.
-- What a group can ever hold per member: a first name (1 to 30 chars), current stop (0 to 11), and which stops'
-- steps were taken (0 to 11). No journal text, no step text, no email.
create table if not exists fim.groups (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[2-9A-HJKMNP-Z]{6}$'),
  name text not null check (char_length(name) between 1 and 60),
  leader_id uuid not null references neon_auth."user"(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists fim.group_members (
  group_id uuid not null references fim.groups(id) on delete cascade,
  user_id uuid not null references neon_auth."user"(id) on delete cascade,
  first_name text not null check (char_length(first_name) between 1 and 30),
  current_stop smallint check (current_stop between 0 and 11),
  steps_taken smallint[] not null default '{}' check (steps_taken <@ '{0,1,2,3,4,5,6,7,8,9,10,11}'::smallint[]),
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index if not exists group_members_user_idx on fim.group_members (user_id);
create index if not exists groups_leader_idx on fim.groups (leader_id);

create or replace function fim.me() returns uuid language sql stable set search_path = pg_catalog
  as $$ select nullif(current_setting('fim.user_id', true), '')::uuid $$;
create or replace function fim.my_group_ids() returns setof uuid language sql stable security definer set search_path = pg_catalog
  as $$ select group_id from fim.group_members where user_id = nullif(current_setting('fim.user_id', true), '')::uuid $$;

-- At most 12 people per group (row lock on the group serializes concurrent joins).
create or replace function fim.group_cap() returns trigger language plpgsql security definer set search_path = pg_catalog as $$
begin
  perform 1 from fim.groups where id = new.group_id for update;
  if (select count(*) from fim.group_members where group_id = new.group_id) >= 12 then
    raise exception 'group-full' using errcode = 'P0012';
  end if;
  return new;
end $$;
drop trigger if exists group_members_cap on fim.group_members;
create trigger group_members_cap before insert on fim.group_members for each row execute function fim.group_cap();
-- If the leader leaves, the group closes (everyone's rows go with it).
create or replace function fim.group_leader_left() returns trigger language plpgsql security definer set search_path = pg_catalog as $$
begin
  delete from fim.groups where id = old.group_id and leader_id = old.user_id;
  return old;
end $$;
drop trigger if exists group_members_leader_left on fim.group_members;
create trigger group_members_leader_left after delete on fim.group_members for each row execute function fim.group_leader_left();

alter table fim.groups enable row level security;
alter table fim.group_members enable row level security;
drop policy if exists groups_member_read on fim.groups;
create policy groups_member_read on fim.groups for select to fim_rls using (id in (select fim.my_group_ids()));
drop policy if exists members_member_read on fim.group_members;
create policy members_member_read on fim.group_members for select to fim_rls using (group_id in (select fim.my_group_ids()));
drop policy if exists members_own_update on fim.group_members;
create policy members_own_update on fim.group_members for update to fim_rls using (user_id = fim.me()) with check (user_id = fim.me());
drop policy if exists members_own_leave on fim.group_members;
create policy members_own_leave on fim.group_members for delete to fim_rls using (user_id = fim.me());
grant select on fim.groups, fim.group_members to fim_rls;
grant update (first_name, current_stop, steps_taken, updated_at) on fim.group_members to fim_rls;
grant delete on fim.group_members to fim_rls;

-- Writes that need more than "my own row" go through these checked functions.
create or replace function fim.group_create(p_code text, p_name text, p_first text) returns uuid language plpgsql security definer set search_path = pg_catalog as $$
declare uid uuid := fim.me(); gid uuid;
begin
  if uid is null then raise exception 'no user' using errcode = 'P0001'; end if;
  if (select count(*) from fim.groups where leader_id = uid) >= 5 then raise exception 'too-many-groups' using errcode = 'P0014'; end if;
  insert into fim.groups (code, name, leader_id) values (p_code, p_name, uid) returning id into gid;
  insert into fim.group_members (group_id, user_id, first_name) values (gid, uid, p_first);
  return gid;
end $$;
create or replace function fim.group_join(p_code text, p_first text) returns uuid language plpgsql security definer set search_path = pg_catalog as $$
declare uid uuid := fim.me(); gid uuid;
begin
  if uid is null then raise exception 'no user' using errcode = 'P0001'; end if;
  select id into gid from fim.groups where code = upper(p_code);
  if gid is null then raise exception 'bad-code' using errcode = 'P0010'; end if;
  if exists (select 1 from fim.group_members where group_id = gid and user_id = uid) then
    update fim.group_members set first_name = p_first, updated_at = now() where group_id = gid and user_id = uid;
  else
    insert into fim.group_members (group_id, user_id, first_name) values (gid, uid, p_first);
  end if;
  return gid;
end $$;
create or replace function fim.group_rename(p_group uuid, p_name text) returns void language plpgsql security definer set search_path = pg_catalog as $$
begin
  update fim.groups set name = p_name, updated_at = now() where id = p_group and leader_id = fim.me();
  if not found then raise exception 'not-leader' using errcode = 'P0011'; end if;
end $$;
create or replace function fim.group_new_code(p_group uuid, p_code text) returns void language plpgsql security definer set search_path = pg_catalog as $$
begin
  update fim.groups set code = p_code, updated_at = now() where id = p_group and leader_id = fim.me();
  if not found then raise exception 'not-leader' using errcode = 'P0011'; end if;
end $$;
create or replace function fim.group_remove(p_group uuid, p_user uuid) returns void language plpgsql security definer set search_path = pg_catalog as $$
begin
  if not exists (select 1 from fim.groups where id = p_group and leader_id = fim.me()) or p_user = fim.me() then
    raise exception 'not-leader' using errcode = 'P0011';
  end if;
  delete from fim.group_members where group_id = p_group and user_id = p_user;
end $$;
create or replace function fim.group_close(p_group uuid) returns void language plpgsql security definer set search_path = pg_catalog as $$
begin
  delete from fim.groups where id = p_group and leader_id = fim.me();
  if not found then raise exception 'not-leader' using errcode = 'P0011'; end if;
end $$;
revoke all on function fim.group_create(text, text, text), fim.group_join(text, text), fim.group_rename(uuid, text), fim.group_new_code(uuid, text),
  fim.group_remove(uuid, uuid), fim.group_close(uuid), fim.my_group_ids(), fim.group_cap(), fim.group_leader_left() from public;
grant execute on function fim.group_create(text, text, text), fim.group_join(text, text), fim.group_rename(uuid, text), fim.group_new_code(uuid, text),
  fim.group_remove(uuid, uuid), fim.group_close(uuid), fim.my_group_ids(), fim.me() to fim_rls;
