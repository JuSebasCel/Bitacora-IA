-- B10: leer las etiquetas visibles sobre las conferencias en una sola consulta.
--
-- Sobre una conferencia, cada persona ve dos cosas: sus propias etiquetas, y
-- —si quien la compartió activó `compartirEtiquetas`— las del dueño. Hasta
-- ahora el frontend resolvía la segunda parte leyendo el "espacio de
-- etiquetas" completo del dueño, algo que con RLS real es imposible: la
-- política de `etiquetas` solo deja a cada quien ver las suyas, y así debe
-- seguir (el nombre de una etiqueta personal puede ser tan revelador como su
-- contenido).
--
-- Dos piezas resuelven esto sin abrir la tabla `etiquetas` de par en par:
--
-- 1. Una política de SELECT acotada: un invitado puede leer una fila de
--    `etiquetas` ajena SOLO si esa etiqueta está asignada a una conferencia
--    que le compartieron con `compartirEtiquetas`. Nada más. No puede
--    enumerar el espacio de nadie.
--
-- 2. Una función que devuelve, para TODAS las conferencias visibles, las
--    etiquetas ya con la marca `propia`, en una sola llamada — para que el
--    dashboard no dispare una consulta por fila. Es `security invoker`
--    (hereda los privilegios de quien llama): las políticas ya filtran lo
--    que puede ver, y una función con más privilegio sería una forma de
--    saltárselas.

create policy "un invitado lee una etiqueta ajena asignada a una conferencia compartida" on etiquetas
  for select to authenticated using (
    exists (
      select 1
      from etiquetas_asignaciones ea
      join comparticiones c on c.id_conferencia = ea.id_conferencia
      where ea.id_etiqueta = etiquetas.id
        and c.id_invitado = auth.uid()
        and (c.privacidad ->> 'compartirEtiquetas')::boolean is true
    )
  );

-- ---------------------------------------------------------------------------
-- mis_etiquetas_visibles: por cada conferencia visible para la sesión, las
-- etiquetas que puede ver sobre ella — propias, y (si la compartición las
-- incluye) las del dueño. Una fila por (conferencia, etiqueta).
-- ---------------------------------------------------------------------------
create or replace function mis_etiquetas_visibles()
returns table (id_conferencia uuid, id_etiqueta uuid, nombre text, propia boolean)
language sql
security invoker
set search_path = ''
as $$
  select
    ea.id_conferencia,
    e.id as id_etiqueta,
    e.nombre,
    (e.id_propietario = auth.uid()) as propia
  from public.etiquetas_asignaciones ea
  join public.etiquetas e on e.id = ea.id_etiqueta
  order by propia desc, e.nombre asc;
$$;

revoke execute on function mis_etiquetas_visibles() from public;
grant execute on function mis_etiquetas_visibles() to authenticated;
