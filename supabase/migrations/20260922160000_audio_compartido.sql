-- Quien aceptó una conferencia compartida puede escuchar su audio.
--
-- El audio vive en la carpeta del dueño (`<id_dueno>/<id_conferencia>/…`) y
-- hasta ahora solo el dueño podía leerla: el invitado veía las fichas pero no
-- podía oír el momento en que se dijo cada una, que es justo la prueba más
-- directa de que la cita es fiel.
--
-- Solo lectura, y solo con la invitación aceptada: igual que las fichas, que
-- la RLS enseña a partir de `aceptada`. Quitar la compartición (o que el
-- invitado la rechace) corta también el audio, sin nada más que hacer.
create policy "el invitado escucha el audio de lo que aceptó" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'audio-conferencias'
    and exists (
      select 1
      from public.comparticiones c
      where c.id_invitado = auth.uid()
        and c.estado = 'aceptada'
        and c.id_dueno::text = (storage.foldername(name))[1]
        and c.id_conferencia::text = (storage.foldername(name))[2]
    )
  );
