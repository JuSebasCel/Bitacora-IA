-- Semilla de la taxonomía.
--
-- El esquema declara que `temas` "crece por curaduría de propuestas -- nunca
-- se crea un tema a mano", y esa regla sigue en pie. Lo que no contemplaba es
-- el arranque: sobre una base vacía el sistema queda en punto muerto, porque
-- las tres piezas se exigen en círculo.
--
--     procesar una charla   exige al menos un tema (PROC_SIN_TEMAS_DISPONIBLES)
--     un tema               sale de aprobar una propuesta
--     una propuesta         sale de procesar una charla
--
-- Se destapó en la primera prueba real: cada intento de análisis moría en
-- `PROC_SIN_TEMAS_DISPONIBLES` antes de llamar a OpenAI.
--
-- Los once temas son los que el propio proyecto ya venía usando en sus
-- fixtures (`taxonomia.fixture.ts`), no un vocabulario inventado aquí: son el
-- pool contra el que se escribieron las pruebas y los datos de ejemplo, así
-- que lo que se clasifique con ellos es coherente con lo que el sistema
-- siempre dijo que clasificaría.
--
-- Los ids los pone Postgres: en el fixture eran cadenas legibles porque
-- viajaban en la URL del catálogo, pero aquí la columna es `uuid`.
--
-- `on conflict do nothing` sobre `nombre`, que es único: así volver a aplicar
-- esto no duplica nada ni pisa un tema que ya haya nacido por curaduría.

insert into temas (nombre)
values
  ('Analítica predictiva'),
  ('Calidad de datos'),
  ('Ética y automatización'),
  ('Gobernanza de datos'),
  ('Infraestructura de investigación'),
  ('Métodos de investigación'),
  ('Modelos de lenguaje'),
  ('Participación ciudadana'),
  ('Reproducibilidad'),
  ('Sensórica ambiental'),
  ('Sesgos algorítmicos')
on conflict (nombre) do nothing;
