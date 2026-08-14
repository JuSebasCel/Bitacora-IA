-- Buckets de Storage (PRD.md sección 8). Vacíos por ahora: la carga real de
-- audio llega con B3, la de plantillas .docx cuando se reconecte F4. Aquí
-- solo se deja el espacio y las políticas listas.

insert into storage.buckets (id, name, public)
values
  ('audio-conferencias', 'audio-conferencias', false),
  ('plantillas-docx', 'plantillas-docx', false);

-- audio-conferencias: privado, ruta {id_dueno}/{id_conferencia}/archivo.
-- Solo el dueño por ahora -- extender a invitados con acceso (vía
-- comparticiones) queda para cuando algún módulo posterior conecte de
-- verdad la reproducción de audio compartido (PRD.md sección 11).
create policy "el dueño administra el audio de su propia carpeta" on storage.objects
  for all to authenticated
  using (bucket_id = 'audio-conferencias' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'audio-conferencias' and (storage.foldername(name))[1] = auth.uid()::text);

-- plantillas-docx: compartido entre todo el grupo, mismo criterio que la
-- tabla `plantillas` (sin roles formales).
create policy "cualquier autenticado administra archivos de plantillas" on storage.objects
  for all to authenticated
  using (bucket_id = 'plantillas-docx')
  with check (bucket_id = 'plantillas-docx');
