-- Al registrarse (supabase.auth.signUp con options.data.nombre), este trigger
-- crea la fila de `profiles` automáticamente en el propio Postgres -- no
-- depende de un segundo paso desde el frontend que podría fallar a medias y
-- dejar una cuenta sin perfil. Patrón estándar de Supabase para perfiles
-- públicos ligados a auth.users.

create or replace function public.crear_perfil_al_registrarse()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nombre, correo)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nombre', ''), new.email);

  return new;
end;
$$;

create trigger al_crear_usuario_crear_perfil
  after insert on auth.users
  for each row execute function public.crear_perfil_al_registrarse();
