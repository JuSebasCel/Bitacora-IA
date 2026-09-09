-- B7: `conversaciones_chat.actualizada_el` la mantiene Postgres, no el cliente.
--
-- El índice de conversaciones del chat se ordena por actividad y no por
-- creación: en una lista larga lo que se busca es el hilo que se estaba
-- hablando. Eso convierte a `actualizada_el` en un dato del que depende lo que
-- la persona ve, y hasta ahora nadie lo escribía después del `insert` inicial.
--
-- La alternativa obvia era que el frontend hiciera un `update` extra tras
-- guardar cada mensaje. Se descarta por dos motivos: son dos viajes por
-- mensaje, y sobre todo son dos escrituras que pueden separarse -- si la
-- segunda falla, la conversación queda ordenada como si nunca se hubiera
-- hablado en ella, y nada vuelve a corregirlo. Aquí las dos ocurren en la
-- misma transacción del `insert`, y el agente conversacional del backend
-- (que escribe con su propia credencial, no por el cliente) hereda el
-- comportamiento sin tener que acordarse de nada.
--
-- Se copia `new.creado_el` en vez de `now()` a propósito: el frontend, que ya
-- recibe la fila insertada, refleja el mismo valor en su lista local sin
-- volver a consultar. Con `now()` el orden en pantalla y el orden guardado
-- diferirían en unos microsegundos por nada.
--
-- Sin `security definer`, al contrario que las funciones de B2: esas
-- necesitaban alcanzar el esquema `vault`, y esta solo toca una fila que la
-- política de acceso del propio usuario ya le permite actualizar
-- (`auth.uid() = id_usuario`). Dejarla con los privilegios de quien llama es
-- una función menos que puede escribir en una conversación ajena.

create or replace function public.marcar_actividad_de_conversacion()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- La guarda `<` evita que un mensaje insertado fuera de orden (un respaldo
  -- restaurado, una reindexación) haga retroceder la marca de actividad.
  update public.conversaciones_chat
     set actualizada_el = new.creado_el
   where id = new.id_conversacion
     and actualizada_el < new.creado_el;

  return new;
end;
$$;

create trigger al_insertar_mensaje_marcar_actividad
  after insert on mensajes_chat
  for each row execute function public.marcar_actividad_de_conversacion();
