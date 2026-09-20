-- Quién es el invitado, para poder decirlo en el aviso.
--
-- El dueño recibe "Aceptaron «tu charla»" sin saber quién, porque lo único
-- que tiene es un uuid y `profiles` no es legible entre cuentas — y no debe
-- serlo: abrirla convertiría cualquier sesión en un directorio de todos los
-- correos del sistema.
--
-- Se guarda el nombre y el correo EN LA COMPARTICIÓN, en el momento de
-- crearla. Es una copia denormalizada a propósito: quien comparte ya conoce
-- ese correo —lo escribió él para invitar— así que guardarlo no le revela
-- nada nuevo, y evita tener que abrir la tabla de perfiles para resolver un
-- nombre.
--
-- Que la copia envejezca si esa persona se cambia el nombre es aceptable: el
-- aviso describe algo que pasó, y decir el nombre que tenía entonces no es
-- menos cierto.

alter table comparticiones
  add column invitado_nombre text not null default '',
  add column invitado_correo text not null default '';
