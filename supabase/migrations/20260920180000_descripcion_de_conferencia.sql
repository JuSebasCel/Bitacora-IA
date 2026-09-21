-- Una nota de quien subió la charla, escrita a mano.
--
-- Distinta de `resumen`, y por eso es una columna aparte y no un reemplazo:
-- `resumen` lo escribe el análisis a partir de las fichas y se vuelve a
-- escribir cada vez que se reanaliza, así que cualquier cosa que una persona
-- pusiera ahí se perdería sin avisar. `descripcion` no la toca el backend
-- nunca.
--
-- Es para lo que el análisis no puede saber: por qué esta charla importa,
-- para qué artículo se guardó, qué se quería sacar de ella. Opcional —
-- vacía es el caso normal, no un dato que falte.

alter table conferencias
  add column descripcion text not null default '';
