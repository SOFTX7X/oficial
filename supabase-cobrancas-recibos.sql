-- VYXORA - cobranças, pagamentos confirmados e recibos
-- Execute uma vez no SQL Editor do Supabase do ambiente de testes.

create table if not exists public.agenda_cobrancas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.agenda_empresas(id) on delete cascade,
  agendamento_id uuid references public.agenda_agendamentos(id) on delete set null,
  codigo text not null unique,
  public_token text not null unique,
  cliente_nome text not null,
  cliente_whatsapp text default '',
  servico_nome text not null,
  profissional_nome text default '',
  valor numeric(12,2) not null check (valor > 0),
  vencimento date not null,
  status text not null default 'pendente' check (status in ('pendente','pago','cancelado')),
  forma_pagamento text not null default 'pix',
  pix_chave text default '',
  pix_copia_cola text default '',
  link_pagamento text default '',
  recibo_codigo text unique,
  pago_em timestamptz,
  cancelado_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint agenda_cobrancas_pagamento_consistente check (
    (status = 'pago' and pago_em is not null and recibo_codigo is not null)
    or (status <> 'pago')
  )
);

create unique index if not exists agenda_cobrancas_agendamento_ativo_uidx
  on public.agenda_cobrancas (agendamento_id)
  where agendamento_id is not null and status <> 'cancelado';

create index if not exists agenda_cobrancas_empresa_status_idx
  on public.agenda_cobrancas (empresa_id, status, criado_em desc);

create index if not exists agenda_cobrancas_public_token_idx
  on public.agenda_cobrancas (public_token);

alter table public.agenda_cobrancas enable row level security;

drop policy if exists "Empresa visualiza suas cobrancas" on public.agenda_cobrancas;
create policy "Empresa visualiza suas cobrancas"
  on public.agenda_cobrancas for select
  to authenticated
  using (
    exists (
      select 1 from public.agenda_perfis perfil
      where perfil.empresa_id = agenda_cobrancas.empresa_id
        and perfil.auth_user_id = auth.uid()
    )
  );

drop policy if exists "Empresa cria suas cobrancas" on public.agenda_cobrancas;
create policy "Empresa cria suas cobrancas"
  on public.agenda_cobrancas for insert
  to authenticated
  with check (
    exists (
      select 1 from public.agenda_perfis perfil
      where perfil.empresa_id = agenda_cobrancas.empresa_id
        and perfil.auth_user_id = auth.uid()
    )
  );

drop policy if exists "Empresa atualiza suas cobrancas" on public.agenda_cobrancas;
create policy "Empresa atualiza suas cobrancas"
  on public.agenda_cobrancas for update
  to authenticated
  using (
    exists (
      select 1 from public.agenda_perfis perfil
      where perfil.empresa_id = agenda_cobrancas.empresa_id
        and perfil.auth_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.agenda_perfis perfil
      where perfil.empresa_id = agenda_cobrancas.empresa_id
        and perfil.auth_user_id = auth.uid()
    )
  );

revoke all on table public.agenda_cobrancas from anon;
grant select, insert, update on table public.agenda_cobrancas to authenticated;

-- A página pública usa uma função restrita: o visitante recebe somente a
-- cobrança cujo token completo foi informado e nunca pode listar a tabela.
create or replace function public.buscar_cobranca_publica(token_busca text)
returns table (
  codigo text,
  public_token text,
  empresa_nome text,
  cliente_nome text,
  servico_nome text,
  profissional_nome text,
  valor numeric,
  vencimento date,
  status text,
  forma_pagamento text,
  pix_chave text,
  pix_copia_cola text,
  link_pagamento text,
  recibo_codigo text,
  pago_em timestamptz,
  criado_em timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select c.codigo, c.public_token, e.nome, c.cliente_nome, c.servico_nome,
    c.profissional_nome, c.valor, c.vencimento, c.status, c.forma_pagamento,
    c.pix_chave, c.pix_copia_cola, c.link_pagamento, c.recibo_codigo,
    c.pago_em, c.criado_em
  from public.agenda_cobrancas c
  join public.agenda_empresas e on e.id = c.empresa_id
  where c.public_token = token_busca
    and c.status <> 'cancelado'
  limit 1;
$$;

revoke all on function public.buscar_cobranca_publica(text) from public;
grant execute on function public.buscar_cobranca_publica(text) to anon, authenticated;
