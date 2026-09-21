-- Las plantillas pasan a ser privadas por cuenta, igual que las memorias
-- (20260911160000). Nacieron abiertas ("cualquier autenticado administra")
-- cuando se pensaban como un recurso del grupo; la decisión del producto es
-- que una plantilla es el diseño de quien la subió, y nadie más debe poder
-- verla, abrirla ni borrarla entrando desde otra cuenta.
--
-- El dueño de cada plantilla existente sale de quien subió su `.docx`:
-- Storage guarda en `storage.objects.owner` la cuenta que hizo la subida, y
-- la ruta del archivo está en la fila. Las que no se puedan atribuir (las
-- viejas en blanco, que no tienen archivo) se quedan con `id_dueno` nulo:
-- con la política nueva no las ve nadie, pero no se borran, por si hiciera
-- falta recuperarlas a mano.
--
-- Las nuevas toman `auth.uid()` por defecto, así que el cliente no manda el
-- dueño —no puede falsearlo— y el `with check` lo confirma.

alter table public.plantillas
  add column id_dueno uuid references auth.users (id) on delete cascade default auth.uid();

update public.plantillas p
  set id_dueno = o.owner
  from storage.objects o
  where o.bucket_id = 'plantillas-docx'
    and o.name = p.ruta_archivo_original
    and p.id_dueno is null;

create index plantillas_id_dueno_idx on public.plantillas (id_dueno);

drop policy "cualquier autenticado administra plantillas" on public.plantillas;

create policy "el dueño administra sus plantillas" on public.plantillas
  for all to authenticated
  using (auth.uid() = id_dueno)
  with check (auth.uid() = id_dueno);

-- ---------------------------------------------------------------------------
-- El bucket, con el mismo criterio. El archivo se sube ANTES de que exista
-- la fila (la ruta es `not null`), así que la política no puede apoyarse en
-- la tabla: se apoya en el dueño del objeto, que Storage fija solo a quien
-- lo sube. Subir un archivo nuevo lo puede cualquiera con sesión; leerlo,
-- reemplazarlo o borrarlo, solo quien lo subió. Un `upsert` sobre la ruta
-- de otra persona pasa por la política de actualización, y ahí se frena.
-- ---------------------------------------------------------------------------

drop policy "cualquier autenticado administra archivos de plantillas" on storage.objects;

create policy "subir archivos de plantillas" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'plantillas-docx');

create policy "el dueño lee sus archivos de plantillas" on storage.objects
  for select to authenticated
  using (bucket_id = 'plantillas-docx' and owner = auth.uid());

create policy "el dueño reemplaza sus archivos de plantillas" on storage.objects
  for update to authenticated
  using (bucket_id = 'plantillas-docx' and owner = auth.uid())
  with check (bucket_id = 'plantillas-docx' and owner = auth.uid());

create policy "el dueño borra sus archivos de plantillas" on storage.objects
  for delete to authenticated
  using (bucket_id = 'plantillas-docx' and owner = auth.uid());
