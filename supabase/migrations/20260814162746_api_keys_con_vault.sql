-- B2: gestión real de la API key de OpenAI por usuario (`PRD.md` módulo B2,
-- `CLAUDE.md` sección 4: "nunca en texto plano"). `clave_cifrada` (columna de
-- B1, nunca escrita -- la tabla sigue vacía) se reemplaza por una referencia
-- a un secreto de Supabase Vault, que resuelve cifrado en reposo y manejo de
-- claves sin tener que decidir a mano dónde vive la clave simétrica.
--
-- Tres funciones son el único punto de entrada, ninguna recibe el id de
-- usuario como parámetro -- siempre `auth.uid()` -- así que es
-- estructuralmente imposible pedir o pisar la clave de otra persona desde
-- el cliente. `security definer` + `search_path = ''` con referencias
-- siempre calificadas (`public.`/`vault.`), mismo patrón de función segura
-- que ya usa el proyecto (`crear_perfil_al_registrarse`), pero con el
-- search_path vacío en vez de fijo a `public`, porque estas sí necesitan
-- tocar el esquema `vault`.

create extension if not exists supabase_vault with schema vault;

alter table api_keys
  drop column clave_cifrada,
  add column id_secreto uuid references vault.secrets (id) on delete cascade;

-- ---------------------------------------------------------------------------
-- guardar_mi_api_key: crea o reemplaza la clave de quien llama.
-- ---------------------------------------------------------------------------
create or replace function guardar_mi_api_key(clave text)
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

  if trim(clave) = '' then
    raise exception 'clave_vacia';
  end if;

  select id_secreto into id_secreto_anterior
  from public.api_keys
  where id_usuario = id_usuario_actual;

  id_secreto_nuevo := vault.create_secret(clave);

  insert into public.api_keys (id_usuario, id_secreto)
  values (id_usuario_actual, id_secreto_nuevo)
  on conflict (id_usuario)
  do update set id_secreto = excluded.id_secreto, actualizada_el = now();

  -- Se borra después de insertar el nuevo, nunca antes: así una falla a
  -- mitad de camino deja la clave vieja intacta en vez de a nadie.
  if id_secreto_anterior is not null then
    delete from vault.secrets where id = id_secreto_anterior;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- leer_mi_api_key: descifra y devuelve la clave de quien llama, o null.
-- ---------------------------------------------------------------------------
create or replace function leer_mi_api_key()
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
    where ak.id_usuario = id_usuario_actual
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- borrar_mi_api_key: quita la clave de quien llama, si tenía una.
-- ---------------------------------------------------------------------------
create or replace function borrar_mi_api_key()
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

  select id_secreto into id_secreto_actual
  from public.api_keys
  where id_usuario = id_usuario_actual;

  delete from public.api_keys where id_usuario = id_usuario_actual;

  if id_secreto_actual is not null then
    delete from vault.secrets where id = id_secreto_actual;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Permisos: solo `authenticated`, nunca `anon` ni `public` por defecto.
-- ---------------------------------------------------------------------------
revoke execute on function guardar_mi_api_key(text) from public;
revoke execute on function leer_mi_api_key() from public;
revoke execute on function borrar_mi_api_key() from public;

grant execute on function guardar_mi_api_key(text) to authenticated;
grant execute on function leer_mi_api_key() to authenticated;
grant execute on function borrar_mi_api_key() to authenticated;
