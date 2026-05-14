create table if not exists public.cash_withdrawals (
  id bigserial primary key,
  loja_id uuid not null,
  cash_session_id bigint not null references public.cash_sessions(id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  note text not null check (length(trim(note)) > 0),
  operator text not null,
  created_at timestamptz not null default now()
);

create index if not exists cash_withdrawals_loja_session_idx
  on public.cash_withdrawals (loja_id, cash_session_id);

create index if not exists cash_withdrawals_created_at_idx
  on public.cash_withdrawals (created_at desc);

alter table public.cash_withdrawals enable row level security;

drop policy if exists "cash_withdrawals_select_authenticated" on public.cash_withdrawals;
create policy "cash_withdrawals_select_authenticated"
  on public.cash_withdrawals
  for select
  to authenticated
  using (true);

drop policy if exists "cash_withdrawals_insert_authenticated" on public.cash_withdrawals;
create policy "cash_withdrawals_insert_authenticated"
  on public.cash_withdrawals
  for insert
  to authenticated
  with check (true);
