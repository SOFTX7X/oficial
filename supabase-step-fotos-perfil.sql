-- VyXora Agendas - fotos separadas do painel e da pagina publica.
-- Execute uma vez no SQL Editor do Supabase.

alter table public.agenda_empresas
  add column if not exists foto_perfil_url text not null default '',
  add column if not exists foto_perfil_x integer not null default 50,
  add column if not exists foto_perfil_y integer not null default 50,
  add column if not exists foto_perfil_zoom integer not null default 100,
  add column if not exists foto_publica_url text not null default '',
  add column if not exists foto_publica_x integer not null default 50,
  add column if not exists foto_publica_y integer not null default 50,
  add column if not exists foto_publica_zoom integer not null default 100;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fotos-perfil',
  'fotos-perfil',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Publico pode visualizar fotos de perfil" on storage.objects;
create policy "Publico pode visualizar fotos de perfil"
on storage.objects
for select
to public
using (bucket_id = 'fotos-perfil');

drop policy if exists "Usuario pode enviar suas fotos de perfil" on storage.objects;
create policy "Usuario pode enviar suas fotos de perfil"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'fotos-perfil'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "Usuario pode atualizar suas fotos de perfil" on storage.objects;
create policy "Usuario pode atualizar suas fotos de perfil"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'fotos-perfil'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'fotos-perfil'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "Usuario pode remover suas fotos de perfil" on storage.objects;
create policy "Usuario pode remover suas fotos de perfil"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'fotos-perfil'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);
