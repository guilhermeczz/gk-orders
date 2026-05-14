create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null,
  nome text not null check (length(trim(nome)) > 0),
  telefone text not null check (telefone ~ '^[0-9]{10,11}$'),
  rua text,
  numero text,
  bairro text,
  complemento text,
  referencia text,
  origem text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (loja_id, telefone)
);

create index if not exists clientes_loja_nome_idx
  on public.clientes (loja_id, nome);

create index if not exists clientes_loja_telefone_idx
  on public.clientes (loja_id, telefone);

alter table public.clientes enable row level security;

drop policy if exists "clientes_select_authenticated" on public.clientes;
create policy "clientes_select_authenticated"
  on public.clientes
  for select
  to authenticated
  using (true);

drop policy if exists "clientes_insert_authenticated" on public.clientes;
create policy "clientes_insert_authenticated"
  on public.clientes
  for insert
  to authenticated
  with check (true);

drop policy if exists "clientes_update_authenticated" on public.clientes;
create policy "clientes_update_authenticated"
  on public.clientes
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "clientes_delete_authenticated" on public.clientes;
create policy "clientes_delete_authenticated"
  on public.clientes
  for delete
  to authenticated
  using (true);
