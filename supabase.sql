-- Выполнить целиком в Supabase -> SQL Editor

create table if not exists public.allowed_users (
  email text primary key,
  role text not null check (role in ('him','her'))
);

-- ВСТАВЬТЕ ВАШИ ДВА EMAIL:
-- insert into public.allowed_users(email, role) values
-- ('HIS_EMAIL@example.com','him'),
-- ('HER_EMAIL@example.com','her');

create table if not exists public.heart_state (
  role text primary key check (role in ('him','her')),
  sent_count bigint not null default 0,
  last_sent_at timestamptz
);

insert into public.heart_state(role) values ('him'), ('her')
on conflict (role) do nothing;

alter table public.allowed_users enable row level security;
alter table public.heart_state enable row level security;

-- Прямой доступ из браузера к таблицам закрыт.
revoke all on public.allowed_users from anon, authenticated;
revoke all on public.heart_state from anon, authenticated;

create or replace function public.get_my_role()
returns text
language sql
security definer
set search_path = public
as $$
  select role
  from public.allowed_users
  where lower(email) = lower(auth.jwt() ->> 'email')
  limit 1;
$$;

create or replace function public.send_heart()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r text;
  st public.heart_state%rowtype;
  next_time timestamptz;
begin
  select role into r
  from public.allowed_users
  where lower(email) = lower(auth.jwt() ->> 'email')
  limit 1;

  if r is null then
    raise exception 'Этот e-mail не разрешен';
  end if;

  select * into st
  from public.heart_state
  where role = r
  for update;

  if st.last_sent_at is not null and now() < st.last_sent_at + interval '30 minutes' then
    next_time := st.last_sent_at + interval '30 minutes';
    return jsonb_build_object(
      'ok', false,
      'next_allowed_at', next_time
    );
  end if;

  update public.heart_state
  set sent_count = sent_count + 1,
      last_sent_at = now()
  where role = r
  returning * into st;

  next_time := st.last_sent_at + interval '30 minutes';

  return jsonb_build_object(
    'ok', true,
    'next_allowed_at', next_time
  );
end;
$$;

create or replace function public.get_heart_state()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r text;
  him public.heart_state%rowtype;
  her public.heart_state%rowtype;
  last_role text;
  last_time timestamptz;
  my_next timestamptz;
begin
  select role into r
  from public.allowed_users
  where lower(email) = lower(auth.jwt() ->> 'email')
  limit 1;

  if r is null then
    raise exception 'Этот e-mail не разрешен';
  end if;

  select * into him from public.heart_state where role='him';
  select * into her from public.heart_state where role='her';

  if coalesce(him.last_sent_at, '-infinity'::timestamptz) >= coalesce(her.last_sent_at, '-infinity'::timestamptz) then
    last_role := case when him.last_sent_at is null then null else 'him' end;
    last_time := him.last_sent_at;
  else
    last_role := case when her.last_sent_at is null then null else 'her' end;
    last_time := her.last_sent_at;
  end if;

  if r='him' then
    my_next := case when him.last_sent_at is null then null else him.last_sent_at + interval '30 minutes' end;
  else
    my_next := case when her.last_sent_at is null then null else her.last_sent_at + interval '30 minutes' end;
  end if;

  return jsonb_build_object(
    'him_count', him.sent_count,
    'her_count', her.sent_count,
    'last_sender', last_role,
    'last_sent_at', last_time,
    'my_next_allowed_at', my_next
  );
end;
$$;

grant execute on function public.get_my_role() to authenticated;
grant execute on function public.send_heart() to authenticated;
grant execute on function public.get_heart_state() to authenticated;
