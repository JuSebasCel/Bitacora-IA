-- Cerrar el acceso a la app mientras se trabaja en ella.
--
-- Una sola fila, como `ajustes_de_ia`. Con `cerrado`, quien entra ve una
-- pantalla de "en construcción" en vez de la app; la administración sigue
-- entrando, porque es quien tiene que trabajar mientras tanto.
--
-- Es una compuerta de la interfaz, no de los datos: la RLS de cada tabla no
-- cambia. Lo que se quiere es que nadie use la app a medias mientras se
-- despliega o se prueba algo, no esconder información a quien ya la tenía.
create table if not exists public.estado_del_sitio (
  id boolean primary key default true check (id),
  cerrado boolean not null default false,
  actualizado_el timestamptz not null default now()
);

insert into public.estado_del_sitio default values on conflict do nothing;

alter table public.estado_del_sitio enable row level security;

create policy "todos leen si el sitio está cerrado" on public.estado_del_sitio
  for select to anon, authenticated using (true);

create policy "la administración abre y cierra el sitio" on public.estado_del_sitio
  for update to authenticated
  using (exists (select 1 from public.administradores a where a.id_usuario = auth.uid()))
  with check (exists (select 1 from public.administradores a where a.id_usuario = auth.uid()));

grant select on public.estado_del_sitio to anon, authenticated;
grant update (cerrado, actualizado_el) on public.estado_del_sitio to authenticated;
