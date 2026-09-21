-- Lo que la IA escribió en cada hueco de la plantilla, guardado con la memoria.
--
-- Hasta ahora una memoria era solo una referencia (conferencia + plantilla) y
-- el documento se regeneraba al abrirla: barato y determinista, porque los
-- huecos se llenaban copiando datos. Con la IA escribiendo cada sección eso ya
-- no vale: regenerar al abrir sería volver a pagar la llamada al modelo cada
-- vez, y además obtener un texto distinto en cada visita.
--
-- Se guarda el texto, no el documento. El `.docx` se sigue armando al abrir,
-- a partir de estos textos y de la plantilla: así una plantilla corregida en
-- Word —un logo nuevo, otra fuente— se nota en las memorias ya hechas sin
-- volver a llamar a la IA.
--
-- Forma: `{ "<id del marcador>": "texto" | null }`. `null` es "la charla no dio
-- material para este hueco", y es un dato, no un fallo. La columna es nula
-- para las memorias creadas antes de que existiera.

alter table memorias
  add column secciones jsonb;
