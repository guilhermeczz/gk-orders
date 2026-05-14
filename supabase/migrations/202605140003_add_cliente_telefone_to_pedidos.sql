alter table public.pedidos
  add column if not exists cliente_telefone text;

create index if not exists pedidos_loja_cliente_telefone_idx
  on public.pedidos (loja_id, cliente_telefone);
