-- Выполнить один раз в Supabase -> SQL Editor.
-- Регистрации пользователей нет. Есть только общий счетчик.

create table if not exists public.heart_common (
  id integer primary key default 1 check (id = 1),
  total bigint not null default 0
);

insert into public.heart_common(id, total)
values (1, 0)
on conflict (id) do nothing;

alter table public.heart_common enable row level security;

revoke all on public.heart_common from anon, authenticated;

create or replace function public.get_heart_total()
returns bigint
language sql
security definer
set search_path = public
as $$
  select total from public.heart_common where id = 1;
$$;

create or replace function public.send_heart_common()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  new_total bigint;
begin
  update public.heart_common
  set total = total + 1
  where id = 1
  returning total into new_total;

  return new_total;
end;
$$;

grant execute on function public.get_heart_total() to anon, authenticated;
grant execute on function public.send_heart_common() to anon, authenticated;
