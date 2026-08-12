-- Ledgerly cloud schema
-- Safe to run repeatedly. Existing finance_states data is retained and normalized below.

create extension if not exists pg_trgm with schema extensions;

create table if not exists public.finance_states (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null check (jsonb_typeof(state) = 'object'),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.clients (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  name text not null check (char_length(name) between 1 and 160),
  company text not null default '',
  email text not null default '',
  phone text not null default '',
  billing_address text not null default '',
  city text not null default '',
  notes text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, id)
);

create table if not exists public.invoices (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  invoice_number text not null,
  client_id text,
  client_snapshot jsonb not null default '{}'::jsonb,
  issue_date date not null,
  due_date date not null,
  status text not null check (status in ('draft', 'sent', 'paid', 'overdue')),
  discount numeric(14, 2) not null default 0 check (discount >= 0),
  total numeric(14, 2) not null default 0 check (total >= 0),
  notes text not null default '',
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array'),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, id),
  unique (user_id, invoice_number),
  constraint invoices_client_fk foreign key (user_id, client_id)
    references public.clients (user_id, id) on update cascade on delete set null (client_id)
);

create table if not exists public.expenses (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  merchant text not null check (char_length(merchant) between 1 and 200),
  category text not null,
  amount numeric(14, 2) not null check (amount >= 0),
  spent_on date not null,
  payment_method text not null,
  note text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, id)
);

create index if not exists clients_user_created_idx on public.clients (user_id, created_at desc);
create index if not exists clients_user_name_idx on public.clients (user_id, lower(name));
create index if not exists clients_user_company_idx on public.clients (user_id, lower(company));
create index if not exists clients_name_search_idx on public.clients using gin (lower(name) extensions.gin_trgm_ops);
create index if not exists clients_company_search_idx on public.clients using gin (lower(company) extensions.gin_trgm_ops);
create index if not exists clients_email_search_idx on public.clients using gin (lower(email) extensions.gin_trgm_ops);
create index if not exists invoices_user_issue_date_idx on public.invoices (user_id, issue_date desc);
create index if not exists invoices_user_due_date_idx on public.invoices (user_id, due_date desc);
create index if not exists invoices_user_status_idx on public.invoices (user_id, status);
create index if not exists invoices_user_client_idx on public.invoices (user_id, client_id);
create index if not exists invoices_user_total_idx on public.invoices (user_id, total desc);
create index if not exists invoices_number_search_idx on public.invoices using gin (lower(invoice_number) extensions.gin_trgm_ops);
create index if not exists expenses_user_date_idx on public.expenses (user_id, spent_on desc);
create index if not exists expenses_user_category_idx on public.expenses (user_id, category);
create index if not exists expenses_user_amount_idx on public.expenses (user_id, amount desc);
create index if not exists expenses_merchant_search_idx on public.expenses using gin (lower(merchant) extensions.gin_trgm_ops);

alter table public.finance_states enable row level security;
alter table public.clients enable row level security;
alter table public.invoices enable row level security;
alter table public.expenses enable row level security;

revoke all on table public.finance_states, public.clients, public.invoices, public.expenses from anon;
grant select, insert, update, delete on table public.finance_states, public.clients, public.invoices, public.expenses to authenticated;

drop policy if exists "Users can read their own finance state" on public.finance_states;
drop policy if exists "Users can create their own finance state" on public.finance_states;
drop policy if exists "Users can update their own finance state" on public.finance_states;
drop policy if exists "Users can delete their own finance state" on public.finance_states;
create policy "Users can read their own finance state" on public.finance_states for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can create their own finance state" on public.finance_states for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update their own finance state" on public.finance_states for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete their own finance state" on public.finance_states for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users manage their own clients" on public.clients;
drop policy if exists "Users manage their own invoices" on public.invoices;
drop policy if exists "Users manage their own expenses" on public.expenses;
create policy "Users manage their own clients" on public.clients for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users manage their own invoices" on public.invoices for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users manage their own expenses" on public.expenses for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

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
drop trigger if exists set_clients_updated_at on public.clients;
drop trigger if exists set_invoices_updated_at on public.invoices;
drop trigger if exists set_expenses_updated_at on public.expenses;
create trigger set_finance_states_updated_at before update on public.finance_states for each row execute function public.set_updated_at();
create trigger set_clients_updated_at before update on public.clients for each row execute function public.set_updated_at();
create trigger set_invoices_updated_at before update on public.invoices for each row execute function public.set_updated_at();
create trigger set_expenses_updated_at before update on public.expenses for each row execute function public.set_updated_at();

-- Calculates invoice totals from JSON line items in the same transaction as the sync.
create or replace function public.invoice_total(p_items jsonb, p_discount numeric)
returns numeric
language sql
immutable
security invoker
set search_path = ''
as $$
  select greatest(
    coalesce(sum(
      coalesce((item->>'quantity')::numeric, 0) * coalesce((item->>'rate')::numeric, 0) *
      (1 + coalesce((item->>'taxRate')::numeric, 0) / 100)
    ), 0) - coalesce(p_discount, 0),
    0
  )
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) item;
$$;

-- Atomically updates the legacy document and normalized query tables.
-- Security invoker keeps RLS active and auth.uid() fixes ownership to the caller.
create or replace function public.sync_finance_state(p_state jsonb)
returns timestamptz
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_updated_at timestamptz;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if jsonb_typeof(p_state) <> 'object' then raise exception 'Invalid finance state'; end if;

  insert into public.finance_states (user_id, state)
  values (v_user_id, p_state)
  on conflict (user_id) do update set state = excluded.state
  returning updated_at into v_updated_at;

  delete from public.invoices where user_id = v_user_id;
  delete from public.expenses where user_id = v_user_id;
  delete from public.clients where user_id = v_user_id;

  insert into public.clients (user_id, id, name, company, email, phone, billing_address, city, notes, created_at)
  select
    v_user_id,
    item->>'id',
    item->>'name',
    coalesce(item->>'company', ''),
    coalesce(item->>'email', ''),
    coalesce(item->>'phone', ''),
    coalesce(item->>'billingAddress', ''),
    coalesce(item->>'city', ''),
    coalesce(item->>'notes', ''),
    coalesce((item->>'createdAt')::timestamptz, timezone('utc', now()))
  from jsonb_array_elements(coalesce(p_state->'clients', '[]'::jsonb)) item
  where nullif(item->>'id', '') is not null and nullif(item->>'name', '') is not null;

  insert into public.invoices (user_id, id, invoice_number, client_id, client_snapshot, issue_date, due_date, status, discount, total, notes, items)
  select
    v_user_id,
    item->>'id',
    item->>'invoiceNumber',
    nullif(item->>'clientId', ''),
    coalesce(item->'client', '{}'::jsonb),
    (item->>'issueDate')::date,
    (item->>'dueDate')::date,
    item->>'status',
    coalesce((item->>'discount')::numeric, 0),
    public.invoice_total(item->'items', coalesce((item->>'discount')::numeric, 0)),
    coalesce(item->>'notes', ''),
    coalesce(item->'items', '[]'::jsonb)
  from jsonb_array_elements(coalesce(p_state->'invoices', '[]'::jsonb)) item
  where nullif(item->>'id', '') is not null;

  insert into public.expenses (user_id, id, merchant, category, amount, spent_on, payment_method, note)
  select
    v_user_id,
    item->>'id',
    item->>'merchant',
    item->>'category',
    coalesce((item->>'amount')::numeric, 0),
    (item->>'date')::date,
    item->>'paymentMethod',
    coalesce(item->>'note', '')
  from jsonb_array_elements(coalesce(p_state->'expenses', '[]'::jsonb)) item
  where nullif(item->>'id', '') is not null;

  return v_updated_at;
end;
$$;

revoke all on function public.sync_finance_state(jsonb) from public, anon;
grant execute on function public.sync_finance_state(jsonb) to authenticated;

-- One-time normalization of existing JSON records. Safe on repeated schema runs.
insert into public.clients (user_id, id, name, company, email, city, billing_address, created_at)
select distinct on (fs.user_id, client->>'id')
  fs.user_id,
  client->>'id',
  client->>'name',
  coalesce(client->>'company', client->>'name', ''),
  coalesce(client->>'email', ''),
  coalesce(client->>'city', ''),
  coalesce(client->>'billingAddress', client->>'city', ''),
  fs.updated_at
from public.finance_states fs
cross join lateral jsonb_array_elements(coalesce(fs.state->'invoices', '[]'::jsonb)) invoice
cross join lateral (select invoice->'client' as client) snapshot
where nullif(client->>'id', '') is not null
on conflict (user_id, id) do nothing;

insert into public.invoices (user_id, id, invoice_number, client_id, client_snapshot, issue_date, due_date, status, discount, total, notes, items)
select
  fs.user_id,
  invoice->>'id',
  invoice->>'invoiceNumber',
  coalesce(nullif(invoice->>'clientId', ''), invoice->'client'->>'id'),
  coalesce(invoice->'client', '{}'::jsonb),
  (invoice->>'issueDate')::date,
  (invoice->>'dueDate')::date,
  invoice->>'status',
  coalesce((invoice->>'discount')::numeric, 0),
  public.invoice_total(invoice->'items', coalesce((invoice->>'discount')::numeric, 0)),
  coalesce(invoice->>'notes', ''),
  coalesce(invoice->'items', '[]'::jsonb)
from public.finance_states fs
cross join lateral jsonb_array_elements(coalesce(fs.state->'invoices', '[]'::jsonb)) invoice
where nullif(invoice->>'id', '') is not null
on conflict (user_id, id) do nothing;

insert into public.expenses (user_id, id, merchant, category, amount, spent_on, payment_method, note)
select
  fs.user_id,
  expense->>'id',
  expense->>'merchant',
  expense->>'category',
  coalesce((expense->>'amount')::numeric, 0),
  (expense->>'date')::date,
  expense->>'paymentMethod',
  coalesce(expense->>'note', '')
from public.finance_states fs
cross join lateral jsonb_array_elements(coalesce(fs.state->'expenses', '[]'::jsonb)) expense
where nullif(expense->>'id', '') is not null
on conflict (user_id, id) do nothing;
