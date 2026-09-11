-- B11: las memorias pasan a ser privadas por cuenta, no un recurso del grupo.
--
-- `memorias` nació con la misma política abierta que `plantillas`
-- ("cualquier autenticado administra") porque en B6 no se había decidido
-- todavía si era un recurso del grupo o de cada quien. La decisión del
-- producto es la segunda: una memoria es el documento de trabajo de quien la
-- generó, no algo que el resto del grupo deba poder listar. Compartir el
-- contenido de una conferencia sigue siendo `comparticiones` (B8) — eso no
-- cambia aquí; lo único que se cierra es el listado de memorias ya generadas.
--
-- `id_dueno` de una memoria nueva siempre es `auth.uid()`, nunca un valor que
-- el cliente pudiera falsear. Genera una memoria tanto el dueño de la
-- conferencia como un invitado con acceso a ella (F5 ya lo permite sobre
-- conferencias compartidas) — por eso el `with check` no exige que la
-- conferencia sea del propio dueño, solo que sea una que pueda ver: la
-- subconsulta contra `conferencias` hereda las políticas de esa tabla (dueño
-- o compartida con `auth.uid()`), así que referenciar una conferencia ajena
-- e invisible sigue siendo imposible sin abrir la puerta a un dueño distinto.

alter table memorias
  add column id_dueno uuid references auth.users (id) on delete cascade;

update memorias m
  set id_dueno = c.id_dueno
  from conferencias c
  where c.id = m.id_conferencia
    and m.id_dueno is null;

alter table memorias
  alter column id_dueno set not null;

create index memorias_id_dueno_idx on memorias (id_dueno);

drop policy "cualquier autenticado administra memorias" on memorias;

create policy "el dueño administra sus memorias" on memorias
  for all to authenticated using (auth.uid() = id_dueno) with check (
    auth.uid() = id_dueno
    and exists (select 1 from conferencias c where c.id = memorias.id_conferencia)
  );
