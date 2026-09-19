-- Deshace la semilla de `20260919150000_semilla_de_temas.sql`.
--
-- Aquella migración metió once temas fijos para destrabar el análisis, que
-- moría en `PROC_SIN_TEMAS_DISPONIBLES` sobre una base vacía. Destrababa, pero
-- resolvía el problema equivocado: decidía por adelantado el vocabulario del
-- sistema, y además con temas demasiado específicos.
--
-- La taxonomía la construye el análisis sobre la marcha: reutiliza el tema que
-- encaje y crea uno nuevo cuando ninguno sirve. Partir de una base vacía es un
-- estado legítimo, no un error — el arranque se arregla en el pipeline, no
-- sembrando a mano lo que el sistema debe descubrir.
--
-- Solo se borran los once por nombre exacto, y solo si ninguna ficha los
-- referencia: si alguno ya se usó, se queda. `id_tema` es NOT NULL con clave
-- foránea, así que borrar un tema en uso rompería sus fichas.

delete from temas
where nombre in (
    'Analítica predictiva',
    'Calidad de datos',
    'Ética y automatización',
    'Gobernanza de datos',
    'Infraestructura de investigación',
    'Métodos de investigación',
    'Modelos de lenguaje',
    'Participación ciudadana',
    'Reproducibilidad',
    'Sensórica ambiental',
    'Sesgos algorítmicos'
  )
  and not exists (select 1 from fichas where fichas.id_tema = temas.id);
