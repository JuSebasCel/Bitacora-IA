-- Claves de IA por uso, una cuenta administradora, y claves compartidas.
--
-- 1. Tres usos en vez de dos: `transcripcion`, `fichas` (análisis,
--    condensación y memorias) y `chat`. Con Groq cada cuenta tiene sus
--    propios límites, así que repartir los usos entre cuentas multiplica lo
--    que aguanta el servicio. Cada persona pone las suyas; la que quede vacía
--    usa la primera que haya, en ese orden. Las claves que ya existían como
--    `analisis` pasan a `transcripcion`, y por el orden de respaldo siguen
--    sirviendo para todo, igual que antes.
--
-- 2. Una cuenta administradora que puede decidir que todos usen sus claves
--    (`ajustes_de_ia.claves_compartidas`). Apagado, cada quien usa las suyas.
--
-- 3. Un cupo diario de audio mientras las claves son compartidas: con una
--    sola cuenta pagándolo todo, hace falta un techo común y un "hoy ya no".
--
-- Seguridad: la clave de la administración no puede quedar al alcance de
-- cualquiera con sesión. El backend consulta con el token de quien pide
-- (nunca con permisos de servicio), así que una función que la entregara
-- bastaría llamarla desde el navegador para llevársela. Por eso
-- `clave_para` solo la entrega a quien presente el secreto del servidor,
-- que vive en una variable de entorno del backend. Aquí se guarda su huella
-- SHA-256, no el secreto: la huella de 32 bytes aleatorios no revela nada,
-- y el repositorio puede verla.

-- ---------------------------------------------------------------------------
-- 1. Los tres usos
-- ---------------------------------------------------------------------------

alter table public.api_keys drop constraint api_keys_proposito_check;
update public.api_keys set proposito = 'transcripcion' where proposito = 'analisis';
alter table public.api_keys
  add constraint api_keys_proposito_check check (proposito in ('transcripcion', 'fichas', 'chat'));
alter table public.api_keys alter column proposito set default 'transcripcion';

drop function if exists public.guardar_mi_api_key(text, text);
drop function if exists public.leer_mi_api_key(text);
drop function if exists public.borrar_mi_api_key(text);

/*
  `analisis` se sigue aceptando y se traduce a `transcripcion`: un cliente
  que todavía pida la clave con el nombre viejo no se rompe.
*/
create or replace function public.proposito_normalizado(proposito text)
returns text
language sql
immutable
as $$
  select case when proposito = 'analisis' then 'transcripcion' else proposito end
$$;

create or replace function public.guardar_mi_api_key(clave text, proposito text default 'transcripcion')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  id_usuario_actual uuid := auth.uid();
  uso text := public.proposito_normalizado(guardar_mi_api_key.proposito);
  id_secreto_anterior uuid;
  id_secreto_nuevo uuid;
begin
  if id_usuario_actual is null then
    raise exception 'auth_requerida';
  end if;

  if uso not in ('transcripcion', 'fichas', 'chat') then
    raise exception 'proposito_desconocido';
  end if;

  if trim(clave) = '' then
    raise exception 'clave_vacia';
  end if;

  select ak.id_secreto into id_secreto_anterior
  from public.api_keys ak
  where ak.id_usuario = id_usuario_actual and ak.proposito = uso;

  id_secreto_nuevo := vault.create_secret(clave);

  insert into public.api_keys (id_usuario, proposito, id_secreto)
  values (id_usuario_actual, uso, id_secreto_nuevo)
  on conflict on constraint api_keys_pkey
  do update set id_secreto = excluded.id_secreto, actualizada_el = now();

  if id_secreto_anterior is not null then
    delete from vault.secrets where id = id_secreto_anterior;
  end if;
end;
$$;

create or replace function public.leer_mi_api_key(proposito text default 'transcripcion')
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
      and ak.proposito = public.proposito_normalizado(leer_mi_api_key.proposito)
  );
end;
$$;

create or replace function public.borrar_mi_api_key(proposito text default 'transcripcion')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  id_usuario_actual uuid := auth.uid();
  uso text := public.proposito_normalizado(borrar_mi_api_key.proposito);
  id_secreto_actual uuid;
begin
  if id_usuario_actual is null then
    raise exception 'auth_requerida';
  end if;

  select ak.id_secreto into id_secreto_actual
  from public.api_keys ak
  where ak.id_usuario = id_usuario_actual and ak.proposito = uso;

  delete from public.api_keys ak
  where ak.id_usuario = id_usuario_actual and ak.proposito = uso;

  if id_secreto_actual is not null then
    delete from vault.secrets where id = id_secreto_actual;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Administración y ajustes
-- ---------------------------------------------------------------------------

create table public.administradores (
  id_usuario uuid primary key references auth.users (id) on delete cascade
);

alter table public.administradores enable row level security;

-- Cada quien puede saber si es administrador; nadie puede listar a los demás.
create policy "cada quien ve si es administrador" on public.administradores
  for select to authenticated using (id_usuario = auth.uid());

-- La cuenta con la que se trabaja hoy, la del dueño del proyecto.
insert into public.administradores (id_usuario)
select id from auth.users where id = 'ed296cee-725c-4c66-aec8-7cf9c6b1c2fb';

-- Una sola fila de ajustes: `id` es siempre `true`.
create table public.ajustes_de_ia (
  id boolean primary key default true check (id),
  claves_compartidas boolean not null default false,
  limite_diario_de_audio_s integer not null default 25000 check (limite_diario_de_audio_s > 0),
  actualizado_el timestamptz not null default now()
);

insert into public.ajustes_de_ia default values;

alter table public.ajustes_de_ia enable row level security;

create policy "todos leen los ajustes de ia" on public.ajustes_de_ia
  for select to authenticated using (true);

create policy "la administración cambia los ajustes de ia" on public.ajustes_de_ia
  for update to authenticated
  using (exists (select 1 from public.administradores a where a.id_usuario = auth.uid()))
  with check (exists (select 1 from public.administradores a where a.id_usuario = auth.uid()));

-- ---------------------------------------------------------------------------
-- 3. Cupo diario y secreto del servidor
-- ---------------------------------------------------------------------------

create table public.uso_de_ia (
  dia date primary key,
  segundos_de_audio integer not null default 0
);

alter table public.uso_de_ia enable row level security;

-- Se puede mirar cuánto se usó hoy; escribirlo solo lo hace `reservar_cupo_de_audio`.
create policy "todos leen el uso de ia" on public.uso_de_ia
  for select to authenticated using (true);

create table public.secreto_del_servidor (
  huella bytea primary key
);

alter table public.secreto_del_servidor enable row level security;
-- Sin políticas: solo las funciones de abajo, con `security definer`, lo leen.

insert into public.secreto_del_servidor (huella)
values (decode('f94c1eb13f553a03c892cae306f11334ea92c4f1fce539dccd520cd50131349e', 'hex'));

create or replace function public.es_secreto_del_servidor(secreto text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select coalesce(secreto, '') <> ''
    and exists (
      select 1 from public.secreto_del_servidor s
      where s.huella = extensions.digest(secreto, 'sha256')
    )
$$;

/*
  La clave para un uso, con su respaldo, y si es la compartida.

  Con las claves compartidas encendidas y el secreto correcto, son las de la
  administración; si no, las de quien pregunta. En los dos casos, la del uso
  pedido o, si falta, la primera que haya en el orden transcripción, fichas,
  chat. Si la administración no tiene ninguna, se cae a las propias.
*/
create or replace function public.clave_para(proposito text, secreto text default '')
returns table (clave text, compartida boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  id_usuario_actual uuid := auth.uid();
  uso text := public.proposito_normalizado(clave_para.proposito);
  id_administrador uuid;
  encontrada text;
begin
  if id_usuario_actual is null then
    raise exception 'auth_requerida';
  end if;

  if public.es_secreto_del_servidor(secreto)
     and (select a.claves_compartidas from public.ajustes_de_ia a) then
    select ad.id_usuario into id_administrador from public.administradores ad limit 1;

    select ds.decrypted_secret into encontrada
    from public.api_keys ak
    join vault.decrypted_secrets ds on ds.id = ak.id_secreto
    where ak.id_usuario = id_administrador
    order by (ak.proposito = uso) desc,
             array_position(array['transcripcion', 'fichas', 'chat'], ak.proposito)
    limit 1;

    if encontrada is not null then
      return query select encontrada, true;
      return;
    end if;
  end if;

  select ds.decrypted_secret into encontrada
  from public.api_keys ak
  join vault.decrypted_secrets ds on ds.id = ak.id_secreto
  where ak.id_usuario = id_usuario_actual
  order by (ak.proposito = uso) desc,
           array_position(array['transcripcion', 'fichas', 'chat'], ak.proposito)
  limit 1;

  return query select encontrada, false;
end;
$$;

/*
  Aparta segundos de audio del cupo de hoy, o dice que no caben. Atómica: la
  fila del día se bloquea con el `update`, así que dos cargas a la vez no
  pueden pasarse juntas del límite.
*/
create or replace function public.reservar_cupo_de_audio(segundos integer, secreto text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  limite integer;
begin
  if not public.es_secreto_del_servidor(secreto) then
    raise exception 'secreto_invalido';
  end if;

  select a.limite_diario_de_audio_s into limite from public.ajustes_de_ia a;

  insert into public.uso_de_ia (dia) values (current_date) on conflict (dia) do nothing;

  update public.uso_de_ia u
  set segundos_de_audio = u.segundos_de_audio + greatest(segundos, 0)
  where u.dia = current_date and u.segundos_de_audio + greatest(segundos, 0) <= limite;

  return found;
end;
$$;

/* Lo que la interfaz necesita saber: si las claves son compartidas, si soy la administración, y el cupo de hoy. */
create or replace function public.ajustes_de_ia_para_mi()
returns json
language sql
security definer
set search_path = ''
as $$
  select json_build_object(
    'claves_compartidas', a.claves_compartidas,
    'soy_administracion', exists (select 1 from public.administradores ad where ad.id_usuario = auth.uid()),
    'limite_diario_de_audio_s', a.limite_diario_de_audio_s,
    'audio_usado_hoy_s', coalesce((select u.segundos_de_audio from public.uso_de_ia u where u.dia = current_date), 0)
  )
  from public.ajustes_de_ia a
$$;

revoke execute on function public.guardar_mi_api_key(text, text) from public;
revoke execute on function public.leer_mi_api_key(text) from public;
revoke execute on function public.borrar_mi_api_key(text) from public;
revoke execute on function public.es_secreto_del_servidor(text) from public;
revoke execute on function public.clave_para(text, text) from public;
revoke execute on function public.reservar_cupo_de_audio(integer, text) from public;
revoke execute on function public.ajustes_de_ia_para_mi() from public;

grant execute on function public.guardar_mi_api_key(text, text) to authenticated;
grant execute on function public.leer_mi_api_key(text) to authenticated;
grant execute on function public.borrar_mi_api_key(text) to authenticated;
grant execute on function public.clave_para(text, text) to authenticated;
grant execute on function public.reservar_cupo_de_audio(integer, text) to authenticated;
grant execute on function public.ajustes_de_ia_para_mi() to authenticated;
