-- `buscar_cuenta_por_correo` devuelve también el nombre.
--
-- Devolvía solo el id, y con eso la compartición no podía guardar quién es el
-- invitado: el aviso al dueño acababa diciendo "Aceptaron tu charla" sin
-- nombre. Devolver el nombre de una cuenta cuyo correo exacto ya conoce quien
-- pregunta no revela nada nuevo — sigue sin poder listar ni buscar parecidos.

drop function if exists buscar_cuenta_por_correo(text);

create or replace function buscar_cuenta_por_correo(correo_buscado text)
returns table (id uuid, nombre text, correo text)
language sql
security definer set search_path = public
stable
as $$
  select p.id, p.nombre, p.correo
  from profiles p
  where lower(p.correo) = lower(trim(correo_buscado))
  limit 1;
$$;

revoke execute on function buscar_cuenta_por_correo(text) from public;
grant execute on function buscar_cuenta_por_correo(text) to authenticated;
