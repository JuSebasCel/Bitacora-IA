-- La versión de una ficha escrita a mano por su dueño.
--
-- Una ficha ya guarda dos textos: `fragmento` (lo que se dijo, palabra por
-- palabra) y `condensado` (lo mismo sin las repeticiones del habla, escrito
-- por el análisis). Este es el tercero: el que la persona corrige cuando el
-- condensado no dice lo que quería, o la transcripción se equivocó en una
-- palabra. Va aparte y no pisa a ninguno de los otros dos, por lo mismo que
-- `condensado` no pisa a `fragmento`: el día que alguien quiera saber qué se
-- dijo, o qué entendió el análisis, tiene que seguir ahí.
--
-- Vacío = sin editar. `editada_el` dice cuándo, y es lo que la interfaz usa
-- para marcar la ficha como modificada.
--
-- Sin políticas nuevas: "el dueño administra las fichas de sus conferencias"
-- ya cubre la actualización.

alter table public.fichas
  add column editado text not null default '',
  add column editada_el timestamptz;
