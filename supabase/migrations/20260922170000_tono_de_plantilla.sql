-- El tono con que la IA redacta las memorias de cada plantilla.
--
-- Hasta ahora la indicación de redacción fijaba "tercera persona y tono
-- formal" para todas. Pero la misma charla se cuenta distinto en un informe
-- institucional, en una nota divulgativa o en un resumen para dirección, y
-- eso es una decisión de quien diseña la plantilla, no de cada memoria.
--
-- `{"preset": "institucional" | "academico" | ..., "propio": "..."}`. Con
-- `personalizado`, `propio` es la instrucción que escribió la persona. Un
-- `null` es el tono de siempre (institucional).
alter table public.plantillas
  add column if not exists tono jsonb;
