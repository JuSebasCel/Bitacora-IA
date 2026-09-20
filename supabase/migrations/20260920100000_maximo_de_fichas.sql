-- Cuántas fichas quiere quien carga la conferencia.
--
-- Va en la tabla y no en el cuerpo de la petición de análisis porque el
-- análisis se puede relanzar: se pide al cargar, y "Analizar ahora" o un
-- reintento tras un fallo tienen que respetar la misma decisión sin volver a
-- preguntarla.
--
-- `null` significa sin límite: el análisis devuelve lo que encuentre. Es el
-- valor por defecto, que es también el comportamiento que había hasta ahora.
--
-- El número es una PETICIÓN, no una garantía. El backend lo recorta contra la
-- duración real una vez transcrita la charla — prometer 120 fichas de un audio
-- de dos minutos no es algo que el techo deba permitir, y la duración de
-- verdad no se conoce hasta después de transcribir.

alter table conferencias
  add column maximo_de_fichas integer
    check (maximo_de_fichas is null or maximo_de_fichas > 0);
