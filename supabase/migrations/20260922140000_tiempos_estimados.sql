-- Si los minutos de las fichas de una conferencia son reales o una estimación.
--
-- Una transcripción de texto sin marcas de tiempo no dice en qué minuto se
-- dijo cada cosa: el análisis reparte el texto sobre una duración estimada
-- para poder ordenar las fichas, pero ese minuto no es un dato. Mostrarlo en
-- la interfaz como si lo fuera es inventarlo, así que la conferencia guarda
-- que sus tiempos son estimados y la interfaz no los enseña.
alter table public.conferencias
  add column if not exists tiempos_estimados boolean not null default false;

-- Las transcripciones ya analizadas no guardaron el dato. Se marcan como
-- estimadas: esconder un minuto real es un daño menor que enseñar uno falso.
update public.conferencias
  set tiempos_estimados = true
  where fuente = 'transcripcion';
