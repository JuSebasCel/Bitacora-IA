-- Compartir pasa a ser una invitación, no un acceso inmediato.
--
-- Hasta ahora, insertar la fila en `comparticiones` le daba acceso al invitado
-- en el acto: no había nada que aceptar ni forma de decir que no. Alguien
-- podía llenarte el archivo de charlas ajenas sin tu consentimiento, y quien
-- compartía nunca sabía si la otra persona la quiso.
--
-- Ahora la fila nace `pendiente` y solo abre el contenido al aceptarse.

alter table comparticiones
  add column estado text not null default 'pendiente'
    check (estado in ('pendiente', 'aceptada', 'rechazada')),
  add column respondida_el timestamptz,
  -- Para que el aviso al dueño deje de aparecer cuando ya lo vio. Vive aquí y
  -- no en una tabla de notificaciones porque el único aviso que existe hoy se
  -- deriva de esta misma fila; una tabla aparte habría que mantenerla en
  -- sincronía con ella sin que nadie gane nada.
  add column respuesta_vista_por_dueno boolean not null default false;

-- Lo ya compartido antes de esto se da por aceptado: esas personas llevan
-- tiempo viendo esas charlas y quitárselas ahora sería una sorpresa peor que
-- el problema que esta migración arregla.
update comparticiones set estado = 'aceptada', respuesta_vista_por_dueno = true;

-- ---------------------------------------------------------------------------
-- La conferencia se ve desde que hay invitación; sus fichas, solo al aceptar.
--
-- El invitado necesita ver el título para decidir si acepta, así que la
-- política de `conferencias` no exige el estado. Lo que sí lo exige es todo lo
-- que tiene contenido real: las fichas. Una invitación pendiente enseña de qué
-- va la charla y nada más.
-- ---------------------------------------------------------------------------

drop policy if exists "un invitado ve las fichas según la privacidad compartida" on fichas;

create policy "un invitado ve las fichas según la privacidad compartida" on fichas
  for select to authenticated using (
    exists (
      select 1 from comparticiones c
      where c.id_conferencia = fichas.id_conferencia
        and c.id_invitado = auth.uid()
        and c.estado = 'aceptada'
        and (
          fichas.estado_de_validacion = 'validada'
          or (c.privacidad ->> 'compartirFichasPendientes')::boolean is true
        )
    )
  );

drop policy if exists "un invitado con permiso valida fichas de una conferencia compartida" on fichas;

create policy "un invitado con permiso valida fichas de una conferencia compartida" on fichas
  for update to authenticated using (
    exists (
      select 1 from comparticiones c
      where c.id_conferencia = fichas.id_conferencia
        and c.id_invitado = auth.uid()
        and c.estado = 'aceptada'
        and (c.privacidad ->> 'permitirValidarFichas')::boolean is true
    )
  );

-- ---------------------------------------------------------------------------
-- El invitado responde su propia invitación.
--
-- La política de lectura que ya existía no alcanza: responder es un `update`, y
-- el dueño es el único con permiso de escritura sobre la tabla. Se limita a las
-- filas dirigidas a esa persona; qué columnas puede tocar no lo puede acotar
-- RLS, así que lo sostiene el repositorio, que solo escribe el estado y su
-- fecha.
-- ---------------------------------------------------------------------------

create policy "un invitado responde la invitación dirigida a él" on comparticiones
  for update to authenticated
  using (auth.uid() = id_invitado)
  with check (auth.uid() = id_invitado);

-- ---------------------------------------------------------------------------
-- Buscar a quién invitar por correo, sin abrir el directorio de cuentas.
--
-- `profiles` no es legible entre usuarios y no debe serlo: listarla completa
-- convierte cualquier cuenta en un directorio de todos los correos del
-- sistema. Esta función devuelve el id de UNA cuenta cuyo correo coincida
-- exacto, y nada más — ni nombre, ni si existe alguna parecida.
--
-- `security definer` para poder mirar `profiles` por encima de RLS, con
-- `search_path` fijo para que no se pueda redirigir a otra tabla.
-- ---------------------------------------------------------------------------

create or replace function buscar_cuenta_por_correo(correo_buscado text)
returns uuid
language sql
security definer set search_path = public
stable
as $$
  select id from profiles where lower(correo) = lower(trim(correo_buscado)) limit 1;
$$;

revoke execute on function buscar_cuenta_por_correo(text) from public;
grant execute on function buscar_cuenta_por_correo(text) to authenticated;
