-- Execute uma vez no SQL Editor do Supabase.
-- Permite excluir somente cobranças não pagas pertencentes à própria empresa.

drop policy if exists "Empresa exclui suas cobrancas" on public.agenda_cobrancas;
create policy "Empresa exclui suas cobrancas"
  on public.agenda_cobrancas for delete
  to authenticated
  using (
    status <> 'pago'
    and exists (
      select 1 from public.agenda_perfis perfil
      where perfil.empresa_id = agenda_cobrancas.empresa_id
        and perfil.auth_user_id = auth.uid()
    )
  );

grant delete on table public.agenda_cobrancas to authenticated;
