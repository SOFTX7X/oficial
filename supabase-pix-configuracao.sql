-- Execute uma vez no SQL Editor do Supabase do projeto VYXORA.
-- Armazena a configuração PIX da empresa; cada cobrança continua guardando
-- uma cópia da chave e do payload usados no momento em que foi criada.

alter table public.agenda_empresas
  add column if not exists pix_tipo text not null default '',
  add column if not exists pix_chave text not null default '',
  add column if not exists pix_nome_recebedor text not null default '',
  add column if not exists pix_cidade text not null default '';

alter table public.agenda_empresas
  drop constraint if exists agenda_empresas_pix_tipo_check;

alter table public.agenda_empresas
  add constraint agenda_empresas_pix_tipo_check
  check (pix_tipo in ('', 'cpf', 'cnpj', 'telefone', 'email', 'aleatoria'));
