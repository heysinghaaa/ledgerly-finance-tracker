create table if not exists public.finance_states (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null check (jsonb_typeof(state) = 'object'),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.finance_states enable row level security;

revoke all on table public.finance_states from anon;
grant select, insert, update, delete on table public.finance_states to authenticated;

create policy "Users can read their own finance state"
on public.finance_states
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own finance state"
on public.finance_states
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own finance state"
on public.finance_states
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own finance state"
on public.finance_states
for delete
to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_finance_states_updated_at on public.finance_states;

create trigger set_finance_states_updated_at
before update on public.finance_states
for each row
execute function public.set_updated_at();
