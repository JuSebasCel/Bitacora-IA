-- Una API key por propósito: una para el análisis (transcribir, analizar y
-- redactar memorias) y otra, opcional, para el chat.
--
-- Separarlas deja poner un límite de gasto distinto a cada uso en OpenAI —
-- el análisis de una charla larga cuesta mucho más que una pregunta de chat
-- — y cortar uno sin tocar el otro. La del chat es opcional: sin ella, el
-- chat usa la de análisis (lo resuelve el backend), así que nadie que ya
-- tenía su clave pierde nada con este cambio.
--
-- Las filas que ya existen pasan a ser de `analisis`, que es para lo que se
-- usaban. Las tres funciones conservan su nombre y reciben el propósito con
-- `analisis` por defecto: un cliente viejo que las llama sin argumentos
-- sigue funcionando igual. Hay que borrarlas antes de recrearlas: con la
-- versión sin parámetros viva, una llamada sin argumentos sería ambigua
-- entre las dos.

alter table public.api_keys
  add column proposito text not null default 'analisis'
    check (proposito in ('analisis', 'chat'));

alter table public.api_keys drop constraint api_keys_pkey;
alter table public.api_keys add constraint api_keys_pkey primary key (id_usuario, proposito);

drop function if exists public.guardar_mi_api_key(text);
drop function if exists public.leer_mi_api_key();
drop function if exists public.borrar_mi_api_key();

create or replace function public.guardar_mi_api_key(clave text, proposito text default 'analisis')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  id_usuario_actual uuid := auth.uid();
  id_secreto_anterior uuid;
  id_secreto_nuevo uuid;
begin
  if id_usuario_actual is null then
    raise exception 'auth_requerida';
  end if;

  if proposito not in ('analisis', 'chat') then
    raise exception 'proposito_desconocido';
  end if;

  if trim(clave) = '' then
    raise exception 'clave_vacia';
  end if;

  select ak.id_secreto into id_secreto_anterior
  from public.api_keys ak
  where ak.id_usuario = id_usuario_actual and ak.proposito = guardar_mi_api_key.proposito;

  id_secreto_nuevo := vault.create_secret(clave);

  insert into public.api_keys (id_usuario, proposito, id_secreto)
  values (id_usuario_actual, guardar_mi_api_key.proposito, id_secreto_nuevo)
  on conflict on constraint api_keys_pkey
  do update set id_secreto = excluded.id_secreto, actualizada_el = now();

  -- Se borra después de insertar el nuevo, nunca antes: así una falla a
  -- mitad de camino deja la clave vieja intacta en vez de a nadie.
  if id_secreto_anterior is not null then
    delete from vault.secrets where id = id_secreto_anterior;
  end if;
end;
$$;

create or replace function public.leer_mi_api_key(proposito text default 'analisis')
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  id_usuario_actual uuid := auth.uid();
begin
  if id_usuario_actual is null then
    raise exception 'auth_requerida';
  end if;

  return (
    select ds.decrypted_secret
    from public.api_keys ak
    join vault.decrypted_secrets ds on ds.id = ak.id_secreto
    where ak.id_usuario = id_usuario_actual and ak.proposito = leer_mi_api_key.proposito
  );
end;
$$;

create or replace function public.borrar_mi_api_key(proposito text default 'analisis')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  id_usuario_actual uuid := auth.uid();
  id_secreto_actual uuid;
begin
  if id_usuario_actual is null then
    raise exception 'auth_requerida';
  end if;

  select ak.id_secreto into id_secreto_actual
  from public.api_keys ak
  where ak.id_usuario = id_usuario_actual and ak.proposito = borrar_mi_api_key.proposito;

  delete from public.api_keys ak
  where ak.id_usuario = id_usuario_actual and ak.proposito = borrar_mi_api_key.proposito;

  if id_secreto_actual is not null then
    delete from vault.secrets where id = id_secreto_actual;
  end if;
end;
$$;

revoke execute on function public.guardar_mi_api_key(text, text) from public;
revoke execute on function public.leer_mi_api_key(text) from public;
revoke execute on function public.borrar_mi_api_key(text) from public;

grant execute on function public.guardar_mi_api_key(text, text) to authenticated;
grant execute on function public.leer_mi_api_key(text) to authenticated;
grant execute on function public.borrar_mi_api_key(text) to authenticated;
