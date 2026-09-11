-- B10-fix: rompe la recursión infinita entre `etiquetas` y `etiquetas_asignaciones`.
--
-- La política de `etiquetas` añadida en B10 consulta `etiquetas_asignaciones`
-- para decidir si una fila ajena es visible por compartición. Pero
-- `etiquetas_asignaciones` tiene su propia política ("el dueño administra sus
-- asignaciones") que consulta `etiquetas` de vuelta para confirmar la
-- propiedad. Postgres entra en ciclo evaluando la una contra la otra y
-- responde `42P17: infinite recursion detected in policy`.
--
-- Solo se descubre en producción, nunca en las pruebas mockeadas del
-- frontend, porque el mock nunca ejecuta una política de verdad.
--
-- La salida es la misma que ya usa el proyecto para Vault: una función
-- `security definer` propiedad del rol que corre las migraciones. Ese rol es
-- dueño de las tablas y por eso está exento de RLS sobre ellas (a menos que
-- se fuerce con `force row level security`, que este esquema no usa) -- así
-- que dentro de la función, leer `etiquetas_asignaciones` y `comparticiones`
-- no vuelve a disparar la política de `etiquetas` que la llamó.

create or replace function etiqueta_compartida_conmigo(id_etiqueta_consultada uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.etiquetas_asignaciones ea
    join public.comparticiones c on c.id_conferencia = ea.id_conferencia
    where ea.id_etiqueta = id_etiqueta_consultada
      and c.id_invitado = auth.uid()
      and (c.privacidad ->> 'compartirEtiquetas')::boolean is true
  );
$$;

revoke execute on function etiqueta_compartida_conmigo(uuid) from public;
grant execute on function etiqueta_compartida_conmigo(uuid) to authenticated;

drop policy "un invitado lee una etiqueta ajena asignada a una conferencia compartida" on etiquetas;

create policy "un invitado lee una etiqueta ajena asignada a una conferencia compartida" on etiquetas
  for select to authenticated using (etiqueta_compartida_conmigo(id));
