-- La versión condensada de una ficha, junto a la literal.
--
-- El habla real repite: "la resolución es la resolución que viene por derecho
-- de norma, esa es la resolución que se menciona aquí". Dicho así se entiende;
-- escrito, no dice nada. El análisis tiene prohibido reescribir el fragmento
-- —la promesa del producto es que la cita es literal— así que solo podía
-- recortarlo o descartarlo, nunca condensarlo.
--
-- Se guardan las dos. `fragmento` sigue siendo lo que se dijo, palabra por
-- palabra, y es lo que se cita; `condensado` es la misma idea sin las
-- repeticiones, y es lo que se lee. Vacío significa que no hizo falta
-- condensarla o que el paso no llegó a correr.
--
-- Nunca se sustituye a `fragmento`: el día que alguien quiera verificar qué se
-- dijo, el original tiene que seguir ahí. Por eso son dos columnas y no una
-- que se sobrescribe.

alter table fichas
  add column condensado text not null default '';
