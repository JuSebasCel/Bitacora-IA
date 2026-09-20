import type { Ficha } from './tipos'

/*
  Fichas de ejemplo para la fase 1, ancladas a las conferencias de
  `conferencias.fixture.ts`.

  Solo las conferencias en estado 'procesada' tienen fichas: una conferencia en
  cola, procesando o fallida todavía no produjo ninguna, y esa asimetría es lo
  que hace demostrables los estados vacíos del detalle sin inventar banderas.

  El `fragmento` reproduce habla transcrita, no un resumen, porque es la
  diferencia que el producto entero defiende: el dato verificable frente al
  texto interpretado. El `contextoMinimo` es lo que permite revisar una ficha
  sin reescuchar la charla, según PLAN.md sección 4.1.

  La granularidad no es uniforme a propósito (PLAN.md sección 2.2, "ni oración
  suelta ni charla completa"): una `cita-textual` es corta y punzante, porque
  eso es lo que la hace citable tal cual. Todo lo demás (método, estrategia,
  postura, dato de impacto, fase del trabajo) es un segmento temático completo
  que desarrolla una idea entera, no una línea suelta — si se fragmentara la
  idea en dos fichas, se perdería el argumento completo que alguien necesita
  para citarla con contexto.

  Cuando entre B4 este archivo SE BORRA: las fichas reales salen del análisis de
  discurso, con su confianza calculada por consistencia entre pasadas.
*/

/*
  Sin condensar: el condensado se pone abajo y solo donde ilustra algo.

  Dejarlo como un campo más de cada entrada obligaría a escribir setenta y
  dos cadenas vacías para que tres digan algo. El dominio ya trata el vacío
  como "no hizo falta condensarla", que es exactamente lo que le pasa a la
  mayoría de las de ejemplo.
*/
const SIN_CONDENSAR: readonly Omit<Ficha, 'condensado'>[] = [
  /* cnf-alc-01: Modelos de lenguaje aplicados a la revisión sistemática de literatura */
  {
    id: 'fch-alc-01-01',
    idConferencia: 'cnf-alc-01',
    fragmento:
      'Nosotros no le pedimos al modelo que decida si el artículo entra o no en la revisión. Le pedimos que ordene la pila de mayor a menor probabilidad de relevancia, y la decisión de exclusión sigue siendo de una persona, siempre. La diferencia parece sutil, pero cambia todo el diseño del sistema: no estamos construyendo un clasificador binario que hay que auditar por sesgo de exclusión, estamos construyendo un lector rápido que prioriza el trabajo de un lector humano que de todas formas iba a hacer la revisión completa.',
    hablante: 'Mariana Escobar Vallejo',
    segundoInicio: 245,
    segundoFin: 268,
    idTema: 'tem-modelos-de-lenguaje',
    tipoDeUnidad: 'postura',
    estadoDeValidacion: 'validada',
    confianzaAutomatica: 0.91,
    contextoMinimo:
      'Venía explicando la diferencia entre cribado asistido y cribado automático, justo antes de mostrar el diagrama del flujo.',
  },
  {
    id: 'fch-alc-01-02',
    idConferencia: 'cnf-alc-01',
    fragmento:
      'El protocolo fue de dos pasadas ciegas sobre el mismo lote de resúmenes: dos revisores distintos, sin ver la decisión del otro, clasificaban cada resumen como relevante, irrelevante o dudoso. Solo cuando las dos pasadas discreparon, o cuando alguna quedó marcada como dudosa, entraba una tercera revisión humana a resolver el empate. Esto nos permitió medir el acuerdo entre revisores desde el primer lote, en vez de asumirlo, y detectar temprano que dos de nuestros criterios de inclusión estaban redactados de forma ambigua.',
    hablante: 'Mariana Escobar Vallejo',
    segundoInicio: 412,
    segundoFin: 434,
    idTema: 'tem-modelos-de-lenguaje',
    tipoDeUnidad: 'metodo',
    estadoDeValidacion: 'validada',
    confianzaAutomatica: 0.88,
    contextoMinimo:
      'Descripción del diseño del estudio, después de presentar el tamaño del corpus de partida.',
  },
  {
    id: 'fch-alc-01-03',
    idConferencia: 'cnf-alc-01',
    fragmento:
      'De cuatro mil doscientos resúmenes iniciales, el cribado asistido nos dejó ochocientos para lectura completa, un descarte de más del ochenta por ciento sin que ningún resumen se leyera dos veces por error. Calculamos que, al ritmo de nuestro equipo, revisar manualmente los cuatro mil doscientos habría tomado alrededor de tres semanas adicionales de trabajo dedicado. Esas tres semanas no se perdieron: se destinaron a la fase de extracción de datos, que es donde de verdad hace falta el criterio experto y donde ningún modelo puede sustituir al revisor.',
    hablante: 'Mariana Escobar Vallejo',
    segundoInicio: 690,
    segundoFin: 712,
    idTema: 'tem-modelos-de-lenguaje',
    tipoDeUnidad: 'dato-de-impacto',
    estadoDeValidacion: 'validada',
    confianzaAutomatica: 0.94,
    contextoMinimo:
      'Presentación de resultados cuantitativos del piloto, con la tabla en pantalla.',
  },
  {
    id: 'fch-alc-01-04',
    idConferencia: 'cnf-alc-01',
    fragmento:
      'Cuando el resumen no dice el diseño del estudio, el modelo lo infiere del título, y ahí es donde se equivoca casi siempre.',
    hablante: 'Mariana Escobar Vallejo',
    segundoInicio: 1035,
    segundoFin: 1052,
    idTema: 'tem-modelos-de-lenguaje',
    tipoDeUnidad: 'cita-textual',
    estadoDeValidacion: 'validada',
    confianzaAutomatica: 0.86,
    contextoMinimo:
      'Análisis de los casos de error, mostrando tres ejemplos concretos de clasificación equivocada.',
  },
  {
    id: 'fch-alc-01-05',
    idConferencia: 'cnf-alc-01',
    fragmento:
      'Nuestra estrategia fue calibrar el umbral de corte con un lote piloto de doscientos resúmenes ya revisado a mano, en vez de aceptar el umbral que trae el modelo por defecto. Corrimos la clasificación automática sobre ese lote conocido y comparamos contra las decisiones humanas ya tomadas, ajustando el punto de corte hasta que la sensibilidad se mantuviera por encima del noventa y cinco por ciento. Ese ejercicio de calibración se repite cada vez que cambiamos de dominio temático, porque un umbral que funciona bien para un tema puede ser demasiado permisivo o demasiado estricto en otro.',
    hablante: 'Mariana Escobar Vallejo',
    segundoInicio: 1288,
    segundoFin: 1309,
    idTema: 'tem-modelos-de-lenguaje',
    tipoDeUnidad: 'estrategia',
    estadoDeValidacion: 'automatica',
    confianzaAutomatica: 0.79,
    contextoMinimo: 'Respuesta a una pregunta del público sobre cómo eligieron el punto de corte.',
  },
  {
    id: 'fch-alc-01-06',
    idConferencia: 'cnf-alc-01',
    fragmento:
      'Estamos en la fase de validación externa del protocolo: el mismo procedimiento, con el mismo umbral calibrado, corriendo ahora en dos grupos de investigación que no participaron en el diseño original ni conocen los detalles de cómo se ajustó. La idea es comprobar que el desempeño que reportamos no depende de que quien lo revisó fuera también quien lo construyó. Esperamos tener resultados de los dos grupos en los próximos dos meses, y solo después de eso consideraremos el protocolo listo para publicarse como método reproducible.',
    hablante: 'Mariana Escobar Vallejo',
    segundoInicio: 1640,
    segundoFin: 1658,
    idTema: 'tem-modelos-de-lenguaje',
    tipoDeUnidad: 'fase-del-trabajo',
    estadoDeValidacion: 'validada',
    confianzaAutomatica: 0.9,
    contextoMinimo: 'Cierre de la sección de resultados, antes de pasar a los próximos pasos.',
  },
  {
    id: 'fch-alc-01-07',
    idConferencia: 'cnf-alc-01',
    fragmento:
      'La sensibilidad final quedó en noventa y seis por ciento sobre el lote de validación, un número que suena alto hasta que se traduce a la práctica: eso significa que perdimos cuatro de cada cien estudios relevantes, y hay que decirlo así, sin suavizarlo. En una revisión sistemática pequeña, esos cuatro estudios pueden no importar demasiado; en una revisión de miles de referencias, cuatro por ciento son decenas de estudios que nunca llegan a ojos humanos. Por eso insistimos en que el sistema se presente siempre con esta cifra al lado, no como una nota a pie de página.',
    hablante: 'Mariana Escobar Vallejo',
    segundoInicio: 1902,
    segundoFin: 1927,
    idTema: 'tem-modelos-de-lenguaje',
    tipoDeUnidad: 'dato-de-impacto',
    estadoDeValidacion: 'pendiente',
    confianzaAutomatica: 0.62,
    contextoMinimo:
      'Discusión de limitaciones, inmediatamente después de la tabla de métricas de desempeño.',
  },
  {
    id: 'fch-alc-01-08',
    idConferencia: 'cnf-alc-01',
    fragmento:
      'Si el grupo de investigación no tiene ya un protocolo de revisión escrito, con criterios de inclusión y exclusión claros antes de empezar, automatizar el cribado no resuelve nada: solo hace que los errores de criterio lleguen más rápido y en mayor volumen. La herramienta amplifica lo que ya existe, no lo corrige. Por eso, cuando alguien nos pide ayuda para automatizar su revisión, la primera pregunta que hacemos no es qué modelo usar, sino si el protocolo ya está escrito y probado a mano sobre una muestra pequeña.',
    hablante: 'Mariana Escobar Vallejo',
    segundoInicio: 2180,
    segundoFin: 2201,
    idTema: 'tem-modelos-de-lenguaje',
    tipoDeUnidad: 'postura',
    estadoDeValidacion: 'validada',
    confianzaAutomatica: 0.93,
    contextoMinimo: 'Recomendación final dirigida a grupos que están empezando en el tema.',
  },
  {
    id: 'fch-alc-01-09',
    idConferencia: 'cnf-alc-01',
    fragmento:
      'Publicamos el prompt exacto que usamos para clasificar, el umbral de corte calibrado y el lote completo de calibración con sus decisiones humanas de referencia. Sin esos tres elementos, lo que reportamos en el artículo no es reproducible por nadie, por más que describamos el método en palabras. Nos tomó tiempo convencer a algunos coautores de que valía la pena el esfuerzo de empaquetar todo eso, pero hoy es la parte del trabajo que más nos han agradecido otros grupos que quieren aplicar el mismo protocolo a su propio dominio.',
    hablante: 'Mariana Escobar Vallejo',
    segundoInicio: 2510,
    segundoFin: 2531,
    idTema: 'tem-reproducibilidad',
    tipoDeUnidad: 'estrategia',
    estadoDeValidacion: 'validada',
    confianzaAutomatica: 0.89,
    contextoMinimo: 'Respuesta a una pregunta sobre disponibilidad de materiales del estudio.',
  },

  /* cnf-alc-02: Trazabilidad de datos en estudios longitudinales de salud pública */
  {
    id: 'fch-alc-02-01',
    idConferencia: 'cnf-alc-02',
    fragmento:
      'Cada variable de la base tiene, además de su valor, un registro de quién la capturó, con qué instrumento y en qué versión del manual de campo estaba vigente ese día. Ese registro vive en una tabla aparte, ligada por un identificador único a cada observación, y no se toca nunca después de capturada: si hay que corregir algo, se agrega una nueva versión, no se sobrescribe la anterior. Esto nos permite reconstruir, para cualquier dato sospechoso, exactamente en qué condiciones se recogió.',
    hablante: 'Andrés Felipe Restrepo Ocampo',
    segundoInicio: 198,
    segundoFin: 217,
    idTema: 'tem-calidad-de-datos',
    tipoDeUnidad: 'metodo',
    estadoDeValidacion: 'validada',
    confianzaAutomatica: 0.92,
    contextoMinimo: 'Presentación de la estructura del diccionario de datos del estudio.',
  },
  {
    id: 'fch-alc-02-02',
    idConferencia: 'cnf-alc-02',
    fragmento:
      'El instrumento cambió tres veces en los diez años que lleva el estudio, cada vez con una justificación razonable: mejoras metodológicas, ajustes de vocabulario, preguntas nuevas que la literatura empezó a pedir. Pero si no queda registrado con precisión cuál versión del instrumento se usó en cada ola de campo, la serie completa deja de ser comparable, y diez años de trabajo de campo pierden buena parte de su valor analítico. Sostenemos que ningún cambio de instrumento debería aprobarse sin antes definir cómo se va a documentar la transición.',
    hablante: 'Andrés Felipe Restrepo Ocampo',
    segundoInicio: 445,
    segundoFin: 468,
    idTema: 'tem-calidad-de-datos',
    tipoDeUnidad: 'postura',
    estadoDeValidacion: 'validada',
    confianzaAutomatica: 0.9,
    contextoMinimo:
      'Explicación de por qué la trazabilidad se diseña al inicio y no se reconstruye después.',
  },
  {
    id: 'fch-alc-02-03',
    idConferencia: 'cnf-alc-02',
    fragmento:
      'Optamos por versionar el manual de campo como si fuera código fuente: cada versión tiene un número, un registro de qué cambió respecto a la anterior, y una fecha de vigencia. Ese identificador de versión viaja pegado a cada observación capturada durante ese periodo, así que basta con consultar la tabla de metadatos para saber exactamente qué pregunta se hizo y cómo estaba formulada. Adoptamos herramientas de control de versiones que ya existían para software, en vez de inventar un sistema propio desde cero.',
    hablante: 'Andrés Felipe Restrepo Ocampo',
    segundoInicio: 712,
    segundoFin: 733,
    idTema: 'tem-calidad-de-datos',
    tipoDeUnidad: 'estrategia',
    estadoDeValidacion: 'validada',
    confianzaAutomatica: 0.87,
    contextoMinimo: 'Descripción de la solución adoptada tras el segundo cambio de instrumento.',
  },
  {
    id: 'fch-alc-02-04',
    idConferencia: 'cnf-alc-02',
    fragmento:
      'Recuperamos el ochenta y dos por ciento de las observaciones que habíamos dado por perdidas en la ola de dos mil veinte, cuando la pandemia interrumpió el trabajo de campo presencial a mitad de recolección. El ejercicio de recuperación cruzó los registros administrativos disponibles con los identificadores parciales que sí teníamos, y tomó cerca de cuatro meses de trabajo dedicado exclusivamente a esa reconstrucción. El dieciocho por ciento restante quedó marcado como pérdida irreversible en la documentación pública de la base, en vez de imputarse silenciosamente.',
    hablante: 'Andrés Felipe Restrepo Ocampo',
    segundoInicio: 1080,
    segundoFin: 1101,
    idTema: 'tem-calidad-de-datos',
    tipoDeUnidad: 'dato-de-impacto',
    estadoDeValidacion: 'automatica',
    confianzaAutomatica: 0.81,
    contextoMinimo: 'Resultado del ejercicio de recuperación, con la gráfica de cobertura por ola.',
  },
  {
    id: 'fch-alc-02-05',
    idConferencia: 'cnf-alc-02',
    fragmento:
      'La rotación de personal es el mayor enemigo de un estudio longitudinal, mucho más que el presupuesto.',
    hablante: 'Andrés Felipe Restrepo Ocampo',
    segundoInicio: 1455,
    segundoFin: 1472,
    idTema: 'tem-calidad-de-datos',
    tipoDeUnidad: 'cita-textual',
    estadoDeValidacion: 'validada',
    confianzaAutomatica: 0.95,
    contextoMinimo:
      'Respuesta a una pregunta del público sobre los principales riesgos operativos del proyecto.',
  },
  {
    id: 'fch-alc-02-06',
    idConferencia: 'cnf-alc-02',
    fragmento:
      'Ahora mismo estamos migrando el histórico completo de las tres versiones del instrumento al esquema nuevo de metadatos, un proceso que implica revisar observación por observación cuál versión le corresponde y verificar que ningún registro quede sin su identificador de procedencia. Esperamos terminar antes de que arranque la ola de campo del año entrante, porque queremos que la nueva ola nazca ya dentro del esquema versionado, sin necesidad de una migración retroactiva adicional.',
    hablante: 'Andrés Felipe Restrepo Ocampo',
    segundoInicio: 1810,
    segundoFin: 1834,
    idTema: 'tem-calidad-de-datos',
    tipoDeUnidad: 'fase-del-trabajo',
    estadoDeValidacion: 'validada',
    confianzaAutomatica: 0.88,
    contextoMinimo: 'Estado actual del proyecto, en la sección de trabajo en curso.',
  },
  {
    id: 'fch-alc-02-07',
    idConferencia: 'cnf-alc-02',
    fragmento:
      'Documentar la procedencia de cada dato cuesta, en nuestra experiencia, cerca del quince por ciento del tiempo total de campo: capacitar al equipo en el registro de metadatos, revisar que cada formulario quede correctamente etiquetado, y auditar una muestra al cierre de cada jornada. Es un costo real y hay que presupuestarlo desde el diseño del estudio, no como un añadido de último momento. Con todo, sostenemos que es el quince por ciento mejor invertido del proyecto, porque es lo que hace que los otros diez años de trabajo sigan siendo útiles dentro de otros diez más.',
    hablante: 'Andrés Felipe Restrepo Ocampo',
    segundoInicio: 2115,
    segundoFin: 2140,
    idTema: 'tem-calidad-de-datos',
    tipoDeUnidad: 'dato-de-impacto',
    estadoDeValidacion: 'pendiente',
    confianzaAutomatica: 0.58,
    contextoMinimo: 'Cierre de la charla, con la recomendación dirigida a quienes financian.',
  },

  /* cnf-alc-03: Sesgos algorítmicos en la asignación de subsidios */
  {
    id: 'fch-alc-03-01',
    idConferencia: 'cnf-alc-03',
    fragmento:
      'El puntaje no inventó la desigualdad. La leyó de un registro que ya venía sesgado, y le puso una cifra que parece objetiva.',
    hablante: 'Lucía Ferreira Nogueira',
    segundoInicio: 320,
    segundoFin: 344,
    idTema: 'tem-sesgos-algoritmicos',
    tipoDeUnidad: 'cita-textual',
    estadoDeValidacion: 'validada',
    confianzaAutomatica: 0.93,
    contextoMinimo:
      'Planteamiento central de la charla, justo después de presentar los tres programas analizados.',
  },
  {
    id: 'fch-alc-03-02',
    idConferencia: 'cnf-alc-03',
    fragmento:
      'Comparamos la distribución del puntaje de focalización contra los datos del censo más reciente, desagregando los resultados por zona rural y urbana y por jefatura de hogar, entre otras variables demográficas disponibles. La comparación no buscaba un promedio agregado, que ya sabíamos que se veía razonable, sino las colas de la distribución: dónde el puntaje se aleja más de lo que el censo describe como la composición real de la población elegible. Ahí es donde apareció el patrón que motivó el resto del estudio.',
    hablante: 'Lucía Ferreira Nogueira',
    segundoInicio: 610,
    segundoFin: 631,
    idTema: 'tem-sesgos-algoritmicos',
    tipoDeUnidad: 'metodo',
    estadoDeValidacion: 'validada',
    confianzaAutomatica: 0.89,
    contextoMinimo: 'Descripción del diseño metodológico del análisis comparativo.',
  },
  {
    id: 'fch-alc-03-03',
    idConferencia: 'cnf-alc-03',
    fragmento:
      'En zona rural dispersa, uno de cada tres hogares elegibles quedó por debajo del corte por un dato de vivienda mal capturado.',
    hablante: 'Lucía Ferreira Nogueira',
    segundoInicio: 980,
    segundoFin: 1004,
    idTema: 'tem-sesgos-algoritmicos',
    tipoDeUnidad: 'dato-de-impacto',
    estadoDeValidacion: 'pendiente',
    confianzaAutomatica: 0.64,
    contextoMinimo:
      'Presentación del hallazgo principal, con el mapa de exclusión por municipio en pantalla.',
  },
  {
    id: 'fch-alc-03-04',
    idConferencia: 'cnf-alc-03',
    fragmento:
      'La estrategia que proponemos, y que ya empezamos a implementar con dos de los programas analizados, es auditar el registro administrativo de origen antes que el modelo de focalización, porque ahí está, según nuestras estimaciones, cerca del noventa por ciento del problema. Revisar el algoritmo sin antes limpiar el dato de entrada es optimizar la parte equivocada del sistema. La auditoría de origen incluye comparar campos clave contra fuentes independientes y flagear los registros con inconsistencias antes de que entren siquiera al cálculo del puntaje.',
    hablante: 'Lucía Ferreira Nogueira',
    segundoInicio: 1350,
    segundoFin: 1376,
    idTema: 'tem-sesgos-algoritmicos',
    tipoDeUnidad: 'estrategia',
    estadoDeValidacion: 'validada',
    confianzaAutomatica: 0.91,
    contextoMinimo: 'Sección de recomendaciones de política, tras exponer los tres casos.',
  },
  {
    id: 'fch-alc-03-05',
    idConferencia: 'cnf-alc-03',
    fragmento:
      'Un sistema de focalización que no publica su tasa de exclusión no puede llamarse transparente por publicar su código.',
    hablante: 'Lucía Ferreira Nogueira',
    segundoInicio: 1720,
    segundoFin: 1744,
    idTema: 'tem-sesgos-algoritmicos',
    tipoDeUnidad: 'postura',
    estadoDeValidacion: 'pendiente',
    confianzaAutomatica: 0.67,
    contextoMinimo: 'Respuesta a una pregunta sobre iniciativas de transparencia algorítmica.',
  },
  {
    id: 'fch-alc-03-06',
    idConferencia: 'cnf-alc-03',
    fragmento:
      'Estamos en la etapa de contraste con los equipos territoriales, porque son ellos quienes ven, cara a cara, los casos concretos que el puntaje deja afuera del programa. Les presentamos una muestra de hogares excluidos según nuestro modelo y les pedimos su valoración de campo, sin decirles de antemano cuáles habíamos identificado como probablemente mal excluidos. El grado de coincidencia entre su criterio y nuestro análisis va a ser una de las validaciones más importantes del estudio.',
    hablante: 'Lucía Ferreira Nogueira',
    segundoInicio: 2090,
    segundoFin: 2113,
    idTema: 'tem-sesgos-algoritmicos',
    tipoDeUnidad: 'fase-del-trabajo',
    estadoDeValidacion: 'automatica',
    confianzaAutomatica: 0.76,
    contextoMinimo: 'Estado del trabajo en curso, antes de abrir el espacio de preguntas.',
  },
  {
    id: 'fch-alc-03-07',
    idConferencia: 'cnf-alc-03',
    fragmento:
      'Reconstruimos el puntaje de sesenta mil hogares usando los mismos algoritmos originales pero con los campos de vivienda ya corregidos contra la fuente independiente, y el veintidós por ciento de esos hogares cambió de tramo de clasificación. No todos los cambios favorecieron al hogar: en algunos casos el puntaje corregido subió, sacando del programa a hogares que habían entrado por un error de captura en sentido contrario. Ese hallazgo fue el que terminó de convencer al organismo de que el problema no era ideológico ni de diseño del algoritmo, sino de calidad del dato de entrada.',
    hablante: 'Lucía Ferreira Nogueira',
    segundoInicio: 2440,
    segundoFin: 2463,
    idTema: 'tem-sesgos-algoritmicos',
    tipoDeUnidad: 'dato-de-impacto',
    estadoDeValidacion: 'validada',
    confianzaAutomatica: 0.92,
    contextoMinimo: 'Resultado del ejercicio de recálculo, con la tabla de transiciones de tramo.',
  },
  {
    id: 'fch-alc-03-08',
    idConferencia: 'cnf-alc-03',
    fragmento:
      'Incorporamos una vía de reclamación con revisión humana obligatoria para todo caso que quede a menos de dos puntos del corte de elegibilidad, que es la zona donde un error de captura pesa más y donde el margen de duda es mayor. Cualquier hogar en ese rango puede solicitar una revisión presencial, y esa revisión no puede resolverse únicamente recalculando el puntaje: un funcionario tiene que verificar en terreno al menos uno de los campos en disputa. El mecanismo todavía es nuevo, pero ya redujo el tiempo de respuesta a reclamos de meses a semanas.',
    hablante: 'Lucía Ferreira Nogueira',
    segundoInicio: 2810,
    segundoFin: 2836,
    idTema: 'tem-sesgos-algoritmicos',
    tipoDeUnidad: 'metodo',
    estadoDeValidacion: 'pendiente',
    confianzaAutomatica: 0.61,
    contextoMinimo:
      'Descripción del mecanismo correctivo propuesto, en la parte final de la charla.',
  },

  /* cnf-alc-05: Del prototipo al piloto, sensórica ambiental en cuencas andinas */
  {
    id: 'fch-alc-05-01',
    idConferencia: 'cnf-alc-05',
    fragmento:
      'Instalamos cuarenta nodos de sensórica de bajo costo distribuidos en tres cuencas de la región, cada uno midiendo caudal y turbidez cada quince minutos y transmitiendo los datos por radio a una estación base local. Elegimos hardware de bajo costo a propósito, sabiendo que perderíamos algo de precisión frente a equipos comerciales, porque el objetivo del piloto era demostrar que un despliegue de esta escala era financieramente sostenible para un grupo de investigación sin presupuesto de infraestructura permanente.',
    hablante: 'Paula Andrea Cifuentes Mora',
    segundoInicio: 165,
    segundoFin: 184,
    idTema: 'tem-sensorica-ambiental',
    tipoDeUnidad: 'metodo',
    estadoDeValidacion: 'validada',
    confianzaAutomatica: 0.94,
    contextoMinimo: 'Presentación del despliegue, con el mapa de ubicación de los nodos.',
  },
  {
    id: 'fch-alc-05-02',
    idConferencia: 'cnf-alc-05',
    fragmento:
      'A los dieciocho meses de despliegue, la mitad de los cuarenta nodos había dejado de reportar datos de forma consistente. Revisamos cada caso antes de sacar conclusiones, y el patrón fue claro: ninguno falló por el sensor en sí, que resultó ser el componente más confiable de todo el sistema. Fallaron sobre todo la batería, por un dimensionamiento insuficiente para los meses de menor radiación solar, y el vandalismo, concentrado en los nodos más cercanos a zonas de tránsito peatonal.',
    hablante: 'Paula Andrea Cifuentes Mora',
    segundoInicio: 480,
    segundoFin: 506,
    idTema: 'tem-sensorica-ambiental',
    tipoDeUnidad: 'dato-de-impacto',
    estadoDeValidacion: 'validada',
    confianzaAutomatica: 0.93,
    contextoMinimo: 'Hallazgo principal del piloto, con la curva de nodos activos en el tiempo.',
  },
  {
    id: 'fch-alc-05-03',
    idConferencia: 'cnf-alc-05',
    fragmento:
      'El prototipo se diseña para que funcione. El piloto se diseña para que sobreviva sin ti al lado.',
    hablante: 'Paula Andrea Cifuentes Mora',
    segundoInicio: 795,
    segundoFin: 812,
    idTema: 'tem-sensorica-ambiental',
    tipoDeUnidad: 'cita-textual',
    estadoDeValidacion: 'validada',
    confianzaAutomatica: 0.96,
    contextoMinimo:
      'Frase de síntesis de la charla, justo antes de la sección de lecciones aprendidas.',
  },
  {
    id: 'fch-alc-05-04',
    idConferencia: 'cnf-alc-05',
    fragmento:
      'Pasamos a un esquema de custodia comunitaria, en el que una persona de cada vereda queda como responsable directa del nodo más cercano a su vivienda o su parcela. Esa persona recibe una capacitación breve, una compensación simbólica por el tiempo dedicado, y un canal directo para reportar cualquier anomalía visible sin tener que esperar a que el equipo técnico note la caída en los datos. Desde que adoptamos el esquema, la tasa de vandalismo bajó de forma notable y el tiempo de detección de fallas de batería se redujo a días en vez de semanas.',
    hablante: 'Paula Andrea Cifuentes Mora',
    segundoInicio: 1120,
    segundoFin: 1142,
    idTema: 'tem-sensorica-ambiental',
    tipoDeUnidad: 'estrategia',
    estadoDeValidacion: 'validada',
    confianzaAutomatica: 0.9,
    contextoMinimo: 'Solución adoptada tras el diagnóstico de causas de falla.',
  },
  {
    id: 'fch-alc-05-05',
    idConferencia: 'cnf-alc-05',
    fragmento:
      'Un equipo que la comunidad no entiende para qué sirve es un equipo que nadie va a cuidar.',
    hablante: 'Paula Andrea Cifuentes Mora',
    segundoInicio: 1445,
    segundoFin: 1461,
    idTema: 'tem-participacion-ciudadana',
    tipoDeUnidad: 'postura',
    estadoDeValidacion: 'automatica',
    confianzaAutomatica: 0.83,
    contextoMinimo: 'Reflexión sobre el componente social del despliegue técnico.',
  },
  {
    id: 'fch-alc-05-06',
    idConferencia: 'cnf-alc-05',
    fragmento:
      'Vamos a escalar el despliegue a doce cuencas el año entrante, ya con el modelo de custodia comunitaria incorporado desde el diseño inicial y no como una corrección posterior. Eso significa identificar y capacitar a los custodios locales antes de instalar un solo nodo, en vez de instalar primero y buscar apoyo comunitario después, que fue el orden que seguimos, sin planearlo, la primera vez.',
    hablante: 'Paula Andrea Cifuentes Mora',
    segundoInicio: 1790,
    segundoFin: 1812,
    idTema: 'tem-sensorica-ambiental',
    tipoDeUnidad: 'fase-del-trabajo',
    estadoDeValidacion: 'validada',
    confianzaAutomatica: 0.89,
    contextoMinimo: 'Próximos pasos del proyecto, en el cierre de la presentación.',
  },

  /* cnf-ber-01: Gobernanza de datos abiertos en universidades públicas */
  {
    id: 'fch-ber-01-01',
    idConferencia: 'cnf-ber-01',
    fragmento:
      'La política de datos abiertos que depende de una rectoría dura exactamente lo que dura esa rectoría.',
    hablante: 'Esteban Quiroga Lemus',
    segundoInicio: 210,
    segundoFin: 228,
    idTema: 'tem-gobernanza-de-datos',
    tipoDeUnidad: 'cita-textual',
    estadoDeValidacion: 'validada',
    confianzaAutomatica: 0.95,
    contextoMinimo: 'Apertura de la charla, tras presentar el caso de cuatro universidades.',
  },
  {
    id: 'fch-ber-01-02',
    idConferencia: 'cnf-ber-01',
    fragmento:
      'Revisamos los actos administrativos con los que dieciséis universidades públicas crearon su política de datos abiertos, y luego rastreamos qué había pasado con el repositorio correspondiente cinco años después de esa creación formal. El seguimiento incluyó revisar la actividad de depósito, el estado técnico del repositorio y si la política seguía vigente sin modificaciones que la vaciaran de contenido. No nos interesaba solo si el repositorio existía, sino si seguía cumpliendo la función para la que se creó.',
    hablante: 'Esteban Quiroga Lemus',
    segundoInicio: 465,
    segundoFin: 488,
    idTema: 'tem-gobernanza-de-datos',
    tipoDeUnidad: 'metodo',
    estadoDeValidacion: 'validada',
    confianzaAutomatica: 0.91,
    contextoMinimo: 'Descripción del diseño del estudio comparativo.',
  },
  {
    id: 'fch-ber-01-03',
    idConferencia: 'cnf-ber-01',
    fragmento:
      'Once de los dieciséis repositorios seguían en línea, pero solo cuatro habían recibido un depósito nuevo en el último año.',
    hablante: 'Esteban Quiroga Lemus',
    segundoInicio: 780,
    segundoFin: 803,
    idTema: 'tem-gobernanza-de-datos',
    tipoDeUnidad: 'dato-de-impacto',
    estadoDeValidacion: 'validada',
    confianzaAutomatica: 0.93,
    contextoMinimo: 'Resultado central del estudio, con la tabla de estado por institución.',
  },
  {
    id: 'fch-ber-01-04',
    idConferencia: 'cnf-ber-01',
    fragmento:
      'Lo que distingue a las cuatro universidades cuyo repositorio sigue realmente activo no es el tamaño del presupuesto ni la calidad técnica de la plataforma, sino que el depósito de datos está atado formalmente al proceso administrativo de cierre de proyecto de investigación. En esas instituciones, un proyecto no se considera cerrado hasta que los datos quedan depositados, con lo cual el depósito deja de depender de la buena voluntad de cada investigador y pasa a ser un requisito de trámite, igual que entregar el informe final.',
    hablante: 'Esteban Quiroga Lemus',
    segundoInicio: 1090,
    segundoFin: 1115,
    idTema: 'tem-gobernanza-de-datos',
    tipoDeUnidad: 'estrategia',
    estadoDeValidacion: 'validada',
    confianzaAutomatica: 0.92,
    contextoMinimo: 'Análisis de los factores asociados a la permanencia de la política.',
  },
  {
    id: 'fch-ber-01-05',
    idConferencia: 'cnf-ber-01',
    fragmento:
      'Abrir datos sin financiar su curaduría es publicar un archivo muerto y llamarlo transparencia.',
    hablante: 'Esteban Quiroga Lemus',
    segundoInicio: 1420,
    segundoFin: 1438,
    idTema: 'tem-gobernanza-de-datos',
    tipoDeUnidad: 'postura',
    estadoDeValidacion: 'validada',
    confianzaAutomatica: 0.94,
    contextoMinimo: 'Respuesta a una pregunta sobre presupuesto para infraestructura de datos.',
  },
  {
    id: 'fch-ber-01-06',
    idConferencia: 'cnf-ber-01',
    fragmento:
      'Estamos redactando un modelo de acuerdo interinstitucional que cualquier universidad pueda adaptar y firmar, para que cada institución no tenga que empezar de cero en el diseño legal y administrativo de su política de datos abiertos. El borrador ya incorpora la cláusula de continuidad que mencionamos antes, y estamos revisándolo con las oficinas jurídicas de tres universidades antes de proponerlo como modelo de referencia para el resto del sistema universitario público.',
    hablante: 'Esteban Quiroga Lemus',
    segundoInicio: 1755,
    segundoFin: 1778,
    idTema: 'tem-gobernanza-de-datos',
    tipoDeUnidad: 'fase-del-trabajo',
    estadoDeValidacion: 'automatica',
    confianzaAutomatica: 0.8,
    contextoMinimo: 'Descripción del trabajo en curso, antes del bloque de conclusiones.',
  },
  {
    id: 'fch-ber-01-07',
    idConferencia: 'cnf-ber-01',
    fragmento:
      'Incluimos una cláusula de continuidad que obliga a designar, de forma explícita y documentada, un responsable del repositorio institucional en cada cambio de administración universitaria, sin importar quién ocupe el cargo. La cláusula también exige que la persona saliente entregue un informe breve del estado del repositorio a quien la releve, algo que en las universidades sin esta regla simplemente no ocurría, y que era, según encontramos, la causa más directa detrás de los repositorios abandonados.',
    hablante: 'Esteban Quiroga Lemus',
    segundoInicio: 2050,
    segundoFin: 2075,
    idTema: 'tem-gobernanza-de-datos',
    tipoDeUnidad: 'metodo',
    estadoDeValidacion: 'pendiente',
    confianzaAutomatica: 0.59,
    contextoMinimo: 'Detalle del modelo de acuerdo propuesto, en la sección final.',
  },
  {
    id: 'fch-ber-01-08',
    idConferencia: 'cnf-ber-01',
    fragmento:
      'El costo de sostener un repositorio activo, según nuestras estimaciones sobre las cuatro universidades donde el modelo funciona, es cercano al uno por ciento del presupuesto anual de investigación de la institución, contando personal dedicado, infraestructura y curaduría básica. Es una cifra pequeña frente al argumento que más veces escuchamos como excusa para no sostenerlo, que es la falta de presupuesto. El problema real, en la mayoría de los casos que revisamos, no era financiero sino de continuidad institucional.',
    hablante: 'Esteban Quiroga Lemus',
    segundoInicio: 2380,
    segundoFin: 2405,
    idTema: 'tem-gobernanza-de-datos',
    tipoDeUnidad: 'dato-de-impacto',
    estadoDeValidacion: 'validada',
    confianzaAutomatica: 0.87,
    contextoMinimo: 'Cifra presentada en respuesta a una pregunta sobre sostenibilidad financiera.',
  },

  /* cnf-ber-02: Evaluación de modelos de predicción de deserción estudiantil */
  {
    id: 'fch-ber-02-01',
    idConferencia: 'cnf-ber-02',
    fragmento:
      'El modelo original tenía ochenta y siete por ciento de exactitud global, una cifra que en cualquier reporte técnico se vería como un éxito. Pero al mirar específicamente los casos de alto riesgo, que son los que de verdad le importan a un programa de retención, encontramos que fallaba en cerca de la mitad de ellos: los clasificaba como bajo riesgo cuando en realidad terminaban desertando. La exactitud global estaba escondiendo el error que más costaba.',
    hablante: 'Natalia Bermúdez Arango',
    segundoInicio: 240,
    segundoFin: 264,
    idTema: 'tem-analitica-predictiva',
    tipoDeUnidad: 'dato-de-impacto',
    estadoDeValidacion: 'validada',
    confianzaAutomatica: 0.93,
    contextoMinimo: 'Planteamiento del problema, con la matriz de confusión en pantalla.',
  },
  {
    id: 'fch-ber-02-02',
    idConferencia: 'cnf-ber-02',
    fragmento:
      'Desagregamos el desempeño del modelo por cohorte de ingreso, por jornada académica y por programa, en vez de conformarnos con reportar una sola métrica agregada como suele hacerse. Esa desagregación fue la que reveló que el modelo funcionaba razonablemente bien para estudiantes de jornada diurna y programas presenciales tradicionales, pero se degradaba de forma notable para jornada nocturna y programas técnicos, precisamente los grupos con mayor riesgo real de deserción.',
    hablante: 'Natalia Bermúdez Arango',
    segundoInicio: 560,
    segundoFin: 582,
    idTema: 'tem-analitica-predictiva',
    tipoDeUnidad: 'metodo',
    estadoDeValidacion: 'validada',
    confianzaAutomatica: 0.9,
    contextoMinimo: 'Descripción del enfoque de evaluación propuesto.',
  },
  {
    id: 'fch-ber-02-03',
    idConferencia: 'cnf-ber-02',
    fragmento:
      'Una métrica agregada es un promedio de aciertos sobre poblaciones que no se parecen en nada.',
    hablante: 'Natalia Bermúdez Arango',
    segundoInicio: 890,
    segundoFin: 907,
    idTema: 'tem-analitica-predictiva',
    tipoDeUnidad: 'cita-textual',
    estadoDeValidacion: 'validada',
    confianzaAutomatica: 0.94,
    contextoMinimo: 'Frase de síntesis, antes de mostrar los resultados desagregados.',
  },
  {
    id: 'fch-ber-02-04',
    idConferencia: 'cnf-ber-02',
    fragmento:
      'Propusimos fijar el umbral de alerta por cohorte y no de forma global para toda la institución, aceptando conscientemente más falsos positivos en los grupos de mayor riesgo real, como jornada nocturna. La lógica es que el costo de una alerta de más, que en la práctica significa una llamada de seguimiento del programa de bienestar, es mucho menor que el costo de una alerta que nunca llega para un estudiante que sí necesitaba la intervención.',
    hablante: 'Natalia Bermúdez Arango',
    segundoInicio: 1245,
    segundoFin: 1270,
    idTema: 'tem-analitica-predictiva',
    tipoDeUnidad: 'estrategia',
    estadoDeValidacion: 'automatica',
    confianzaAutomatica: 0.78,
    contextoMinimo: 'Recomendación técnica derivada del análisis desagregado.',
  },
  {
    id: 'fch-ber-02-05',
    idConferencia: 'cnf-ber-02',
    fragmento:
      'Ya tenemos el piloto del modelo ajustado corriendo en dos facultades, generando alertas semanales que llegan directamente al programa de bienestar estudiantil de cada una. La evaluación formal de impacto, comparando tasas de deserción contra un grupo de facultades sin el piloto, está prevista para el semestre siguiente, cuando haya suficiente tiempo de seguimiento para que la comparación tenga sentido estadístico.',
    hablante: 'Natalia Bermúdez Arango',
    segundoInicio: 1620,
    segundoFin: 1644,
    idTema: 'tem-analitica-predictiva',
    tipoDeUnidad: 'fase-del-trabajo',
    estadoDeValidacion: 'validada',
    confianzaAutomatica: 0.88,
    contextoMinimo: 'Estado actual de la implementación, en el cierre de la charla.',
  },

  /* cnf-ber-04: Métodos mixtos en el estudio de adopción tecnológica rural */
  {
    id: 'fch-ber-04-01',
    idConferencia: 'cnf-ber-04',
    fragmento:
      'La encuesta estructurada decía que el setenta por ciento de los productores usaba la plataforma de forma regular, un número que hubiéramos reportado sin dudar si no hubiéramos hecho también el trabajo cualitativo. Las veintiocho entrevistas en profundidad mostraron una realidad distinta: buena parte de ese setenta por ciento la abría apenas una vez al mes, justo antes de la fecha en que sabían que un extensionista podía preguntarles, para poder decir que la usaban.',
    hablante: 'Daniela Marchena Solís',
    segundoInicio: 280,
    segundoFin: 307,
    idTema: 'tem-metodos-de-investigacion',
    tipoDeUnidad: 'dato-de-impacto',
    estadoDeValidacion: 'validada',
    confianzaAutomatica: 0.94,
    contextoMinimo: 'Hallazgo que motivó todo el estudio, presentado al inicio de la charla.',
  },
  {
    id: 'fch-ber-04-02',
    idConferencia: 'cnf-ber-04',
    fragmento:
      'Aplicamos una encuesta panel en tres olas separadas por seis meses cada una, y complementamos ese componente cuantitativo con veintiocho entrevistas en profundidad realizadas a una submuestra estratificada por nivel de adopción declarada. La estratificación fue clave: entrevistamos tanto a quienes decían usar la plataforma todo el tiempo como a quienes decían no usarla nunca, para poder contrastar el discurso contra la práctica en los dos extremos.',
    hablante: 'Daniela Marchena Solís',
    segundoInicio: 590,
    segundoFin: 613,
    idTema: 'tem-metodos-de-investigacion',
    tipoDeUnidad: 'metodo',
    estadoDeValidacion: 'validada',
    confianzaAutomatica: 0.92,
    contextoMinimo: 'Descripción del diseño metodológico, con el esquema de muestreo en pantalla.',
  },
  {
    id: 'fch-ber-04-03',
    idConferencia: 'cnf-ber-04',
    fragmento:
      'Adopción declarada y adopción observada no son dos medidas del mismo fenómeno con distinto margen de error, como suele asumirse en los estudios que solo usan encuesta. Son, sostenemos, dos cosas conceptualmente distintas: una mide lo que la persona cree que debe responder, y la otra mide lo que efectivamente hace. Tratarlas como intercambiables es el error metodológico más común que encontramos en la literatura sobre adopción tecnológica rural.',
    hablante: 'Daniela Marchena Solís',
    segundoInicio: 940,
    segundoFin: 963,
    idTema: 'tem-metodos-de-investigacion',
    tipoDeUnidad: 'postura',
    estadoDeValidacion: 'validada',
    confianzaAutomatica: 0.91,
    contextoMinimo: 'Argumento central de la charla, tras presentar la discrepancia entre fuentes.',
  },
  {
    id: 'fch-ber-04-04',
    idConferencia: 'cnf-ber-04',
    fragmento:
      'Cuando el incentivo es certificar el uso, la respuesta a la encuesta mide el incentivo, no el uso.',
    hablante: 'Daniela Marchena Solís',
    segundoInicio: 1285,
    segundoFin: 1305,
    idTema: 'tem-metodos-de-investigacion',
    tipoDeUnidad: 'cita-textual',
    estadoDeValidacion: 'validada',
    confianzaAutomatica: 0.93,
    contextoMinimo: 'Explicación del mecanismo detrás de la sobredeclaración observada.',
  },
  {
    id: 'fch-ber-04-05',
    idConferencia: 'cnf-ber-04',
    fragmento:
      'Cambiamos el instrumento de la tercera ola para preguntar por la última vez concreta que la persona usó la plataforma y para qué la usó ese día, en lugar de preguntar de forma general si la usa o no. Esa reformulación obliga a la persona a recordar un episodio real en vez de emitir un juicio general sobre sí misma, y es una técnica que tomamos prestada de la literatura sobre sesgo de deseabilidad social en encuestas de comportamiento.',
    hablante: 'Daniela Marchena Solís',
    segundoInicio: 1630,
    segundoFin: 1654,
    idTema: 'tem-metodos-de-investigacion',
    tipoDeUnidad: 'estrategia',
    estadoDeValidacion: 'automatica',
    confianzaAutomatica: 0.82,
    contextoMinimo: 'Ajuste metodológico aplicado en la tercera ola del panel.',
  },
  {
    id: 'fch-ber-04-06',
    idConferencia: 'cnf-ber-04',
    fragmento:
      'Con la pregunta reformulada, la adopción declarada bajó del setenta al treinta y cuatro por ciento, un número mucho más cercano a lo que las entrevistas cualitativas ya venían sugiriendo. La caída no significa que menos gente use la plataforma que antes: significa que la primera cifra nunca reflejó el uso real, y que el instrumento original estaba, sin que lo notáramos, midiendo otra cosa.',
    hablante: 'Daniela Marchena Solís',
    segundoInicio: 1940,
    segundoFin: 1962,
    idTema: 'tem-metodos-de-investigacion',
    tipoDeUnidad: 'dato-de-impacto',
    estadoDeValidacion: 'pendiente',
    confianzaAutomatica: 0.66,
    contextoMinimo: 'Resultado de la tercera ola, comparado contra las dos anteriores.',
  },
  {
    id: 'fch-ber-04-07',
    idConferencia: 'cnf-ber-04',
    fragmento:
      'Estamos preparando la cuarta ola del panel, que va a incorporar observación directa en una submuestra: en vez de preguntar, vamos a acompañar a un grupo de productores durante una jornada normal de trabajo y registrar si abren la plataforma sin que nadie se lo pregunte. La idea es cerrar el triángulo entre lo declarado, lo recordado en entrevista y lo efectivamente observado.',
    hablante: 'Daniela Marchena Solís',
    segundoInicio: 2260,
    segundoFin: 2282,
    idTema: 'tem-metodos-de-investigacion',
    tipoDeUnidad: 'fase-del-trabajo',
    estadoDeValidacion: 'validada',
    confianzaAutomatica: 0.86,
    contextoMinimo: 'Próximos pasos del proyecto, en el cierre de la presentación.',
  },

  /* cnf-zul-01: Calidad de datos en registros administrativos de salud */
  {
    id: 'fch-zul-01-01',
    idConferencia: 'cnf-zul-01',
    fragmento:
      'Catorce millones de registros acumulados en el sistema, y para la mitad de ellos no existe ninguna forma confiable de saber en qué punto de atención se capturaron originalmente. El campo que debería contener esa información se llenó de formas distintas a lo largo de los años, sin un catálogo controlado detrás, así que hoy es prácticamente inútil para cualquier análisis que necesite saber de dónde viene el dato.',
    hablante: 'Mariana Escobar Vallejo',
    segundoInicio: 190,
    segundoFin: 212,
    idTema: 'tem-calidad-de-datos',
    tipoDeUnidad: 'dato-de-impacto',
    estadoDeValidacion: 'validada',
    confianzaAutomatica: 0.93,
    contextoMinimo: 'Diagnóstico inicial presentado al abrir la charla.',
  },
  {
    id: 'fch-zul-01-02',
    idConferencia: 'cnf-zul-01',
    fragmento:
      'Construimos tres familias de indicadores, completitud, consistencia y oportunidad, y los calculamos de forma desagregada por institución y por mes, no como un promedio nacional que escondería las diferencias reales. Completitud mide si el campo tiene un valor; consistencia, si ese valor cae dentro del catálogo esperado; oportunidad, si el registro se capturó dentro de la ventana de tiempo razonable después de la atención.',
    hablante: 'Mariana Escobar Vallejo',
    segundoInicio: 430,
    segundoFin: 452,
    idTema: 'tem-calidad-de-datos',
    tipoDeUnidad: 'metodo',
    estadoDeValidacion: 'validada',
    confianzaAutomatica: 0.92,
    contextoMinimo: 'Descripción del marco de evaluación de calidad aplicado.',
  },
  {
    id: 'fch-zul-01-03',
    idConferencia: 'cnf-zul-01',
    fragmento: 'Limpiar un dato que nunca se capturó bien no es limpiar. Es inventar con método.',
    hablante: 'Mariana Escobar Vallejo',
    segundoInicio: 720,
    segundoFin: 737,
    idTema: 'tem-calidad-de-datos',
    tipoDeUnidad: 'cita-textual',
    estadoDeValidacion: 'validada',
    confianzaAutomatica: 0.96,
    contextoMinimo: 'Frase de síntesis, antes de la sección sobre imputación.',
  },
  {
    id: 'fch-zul-01-04',
    idConferencia: 'cnf-zul-01',
    fragmento:
      'La variable de ocupación es un buen ejemplo de por qué no basta con medir completitud sola: tenía noventa y un por ciento de completitud, es decir, casi todos los registros traían algo escrito ahí, pero solo el doce por ciento de esos valores caía dentro del catálogo oficial de ocupaciones. El resto eran variaciones de texto libre, abreviaturas distintas o directamente errores de digitación, así que un indicador que solo mirara completitud habría reportado la variable como saludable.',
    hablante: 'Mariana Escobar Vallejo',
    segundoInicio: 1010,
    segundoFin: 1037,
    idTema: 'tem-calidad-de-datos',
    tipoDeUnidad: 'dato-de-impacto',
    estadoDeValidacion: 'validada',
    confianzaAutomatica: 0.94,
    contextoMinimo: 'Ejemplo concreto de la diferencia entre completitud y consistencia.',
  },
  {
    id: 'fch-zul-01-05',
    idConferencia: 'cnf-zul-01',
    fragmento:
      'Priorizamos la corrección en el punto de captura, donde el dato nace, antes que cualquier trabajo de depuración aguas abajo sobre la base ya consolidada. La razón es simple: depurar aguas abajo corrige el histórico una sola vez, pero si el problema de captura sigue activo, cada mes que pasa se sigue generando el mismo error. Invertir primero en el punto de captura es más lento de ver reflejado en los indicadores, pero es la única corrección que no hay que repetir.',
    hablante: 'Mariana Escobar Vallejo',
    segundoInicio: 1320,
    segundoFin: 1342,
    idTema: 'tem-calidad-de-datos',
    tipoDeUnidad: 'estrategia',
    estadoDeValidacion: 'validada',
    confianzaAutomatica: 0.91,
    contextoMinimo: 'Recomendación central del estudio, en la sección de intervención.',
  },
  {
    id: 'fch-zul-01-06',
    idConferencia: 'cnf-zul-01',
    fragmento:
      'Un tablero de calidad, por sofisticado que sea, que nadie mira en la institución que efectivamente captura el dato no cambia absolutamente nada en la práctica. Puede ganar premios de innovación en datos abiertos y no mover ni un punto porcentual la consistencia de una variable, porque el tablero vive en una oficina central y quien digita el dato en el punto de atención nunca lo ve.',
    hablante: 'Mariana Escobar Vallejo',
    segundoInicio: 1615,
    segundoFin: 1634,
    idTema: 'tem-calidad-de-datos',
    tipoDeUnidad: 'postura',
    estadoDeValidacion: 'validada',
    confianzaAutomatica: 0.9,
    contextoMinimo: 'Respuesta a una pregunta sobre herramientas de monitoreo.',
  },
  {
    id: 'fch-zul-01-07',
    idConferencia: 'cnf-zul-01',
    fragmento:
      'Devolvimos a cada institución su propio reporte mensual de calidad, comparado explícitamente contra el promedio de instituciones de tamaño y nivel de complejidad parecidos, no contra el promedio nacional que no le decía nada útil a nadie. El reporte llegaba con nombre propio a la persona responsable de digitación en cada sede, no como una cifra anónima en un tablero central.',
    hablante: 'Mariana Escobar Vallejo',
    segundoInicio: 1905,
    segundoFin: 1929,
    idTema: 'tem-calidad-de-datos',
    tipoDeUnidad: 'metodo',
    estadoDeValidacion: 'automatica',
    confianzaAutomatica: 0.84,
    contextoMinimo: 'Descripción del mecanismo de retroalimentación implementado.',
  },
  {
    id: 'fch-zul-01-08',
    idConferencia: 'cnf-zul-01',
    fragmento:
      'A los ocho meses de devolver reportes, la consistencia de la variable de ocupación subió del doce al cincuenta y siete por ciento.',
    hablante: 'Mariana Escobar Vallejo',
    segundoInicio: 2210,
    segundoFin: 2238,
    idTema: 'tem-calidad-de-datos',
    tipoDeUnidad: 'dato-de-impacto',
    estadoDeValidacion: 'validada',
    confianzaAutomatica: 0.95,
    contextoMinimo: 'Resultado de la intervención, con la serie mensual del indicador.',
  },
  {
    id: 'fch-zul-01-09',
    idConferencia: 'cnf-zul-01',
    fragmento:
      'Lo que movió la aguja no fue la capacitación, fue que el reporte llegara con nombre propio a quien digita.',
    hablante: 'Mariana Escobar Vallejo',
    segundoInicio: 2495,
    segundoFin: 2518,
    idTema: 'tem-calidad-de-datos',
    tipoDeUnidad: 'cita-textual',
    estadoDeValidacion: 'pendiente',
    confianzaAutomatica: 0.63,
    contextoMinimo: 'Interpretación del resultado, en respuesta a una pregunta del público.',
  },
  {
    id: 'fch-zul-01-10',
    idConferencia: 'cnf-zul-01',
    fragmento:
      'Estamos en la fase de extender el esquema de reportes mensuales a los registros de urgencias, que resultaron ser, de lejos, los más incompletos de todo el sistema: el ritmo de atención deja poco margen para el registro cuidadoso, y es exactamente donde más se necesita la trazabilidad. Adaptar el esquema a ese contexto va a requerir simplificar el formulario, no solo replicar lo que funcionó en consulta externa.',
    hablante: 'Mariana Escobar Vallejo',
    segundoInicio: 2760,
    segundoFin: 2784,
    idTema: 'tem-calidad-de-datos',
    tipoDeUnidad: 'fase-del-trabajo',
    estadoDeValidacion: 'validada',
    confianzaAutomatica: 0.89,
    contextoMinimo: 'Trabajo en curso, en la sección de próximos pasos.',
  },
  {
    id: 'fch-zul-01-11',
    idConferencia: 'cnf-zul-01',
    fragmento:
      'Ningún estudio que use estos registros administrativos debería publicarse sin reportar, aunque sea en un anexo, la calidad de las variables específicas que usó para sus conclusiones. No pedimos que todos los estudios midan calidad con el mismo detalle que nosotros, pero sí que digan explícitamente qué tan completa y consistente era la variable clave de su análisis, para que quien lea el estudio pueda juzgar por sí mismo cuánto peso darle al resultado.',
    hablante: 'Mariana Escobar Vallejo',
    segundoInicio: 2980,
    segundoFin: 3003,
    idTema: 'tem-reproducibilidad',
    tipoDeUnidad: 'postura',
    estadoDeValidacion: 'validada',
    confianzaAutomatica: 0.92,
    contextoMinimo: 'Recomendación dirigida a la comunidad investigadora, en el cierre.',
  },
  {
    id: 'fch-zul-01-12',
    idConferencia: 'cnf-zul-01',
    fragmento:
      'Publicamos el código completo de los indicadores, con su documentación, para que cualquier institución del sistema pueda calcularlos directamente sobre sus propios datos sin depender de que nosotros lo hagamos por ellos. Ya son tres instituciones distintas las que lo han adaptado a su infraestructura, y una de ellas encontró un error en nuestro cálculo de oportunidad que ya corregimos gracias a esa retroalimentación.',
    hablante: 'Mariana Escobar Vallejo',
    segundoInicio: 3155,
    segundoFin: 3178,
    idTema: 'tem-reproducibilidad',
    tipoDeUnidad: 'estrategia',
    estadoDeValidacion: 'automatica',
    confianzaAutomatica: 0.85,
    contextoMinimo: 'Anuncio final sobre disponibilidad de materiales.',
  },

  /* cnf-zul-03: Participación ciudadana en el diseño de sistemas públicos */
  {
    id: 'fch-zul-03-01',
    idConferencia: 'cnf-zul-03',
    fragmento:
      'Hicimos tres talleres de codiseño, cada uno con una mezcla deliberada de personas que ya habían completado el trámite y personas que lo habían abandonado a medias en algún punto del proceso. Esa mezcla generaba una tensión productiva: quien completó el trámite explicaba cómo lo resolvió, y quien lo abandonó señalaba exactamente dónde se había atascado, muchas veces en el mismo paso que el otro grupo describía como sencillo.',
    hablante: 'Natalia Bermúdez Arango',
    segundoInicio: 225,
    segundoFin: 250,
    idTema: 'tem-participacion-ciudadana',
    tipoDeUnidad: 'metodo',
    estadoDeValidacion: 'validada',
    confianzaAutomatica: 0.93,
    contextoMinimo: 'Descripción del diseño de los talleres, al inicio de la charla.',
  },
  {
    id: 'fch-zul-03-02',
    idConferencia: 'cnf-zul-03',
    fragmento:
      'Quien abandona el trámite es quien más sabe de dónde está el problema, y es justo a quien nunca se le pregunta.',
    hablante: 'Natalia Bermúdez Arango',
    segundoInicio: 520,
    segundoFin: 543,
    idTema: 'tem-participacion-ciudadana',
    tipoDeUnidad: 'cita-textual',
    estadoDeValidacion: 'validada',
    confianzaAutomatica: 0.95,
    contextoMinimo: 'Justificación del criterio de convocatoria de los talleres.',
  },
  {
    id: 'fch-zul-03-03',
    idConferencia: 'cnf-zul-03',
    fragmento:
      'El formulario pasó de veintiocho campos a once después del proceso de codiseño, una reducción que no fue solo cosmética: al revisar con las dependencias internas para qué se usaba cada campo, encontramos que nueve de los diecisiete eliminados no los consultaba absolutamente ninguna oficina. Habían sobrevivido por inercia administrativa, no porque alguien los necesitara.',
    hablante: 'Natalia Bermúdez Arango',
    segundoInicio: 880,
    segundoFin: 903,
    idTema: 'tem-participacion-ciudadana',
    tipoDeUnidad: 'dato-de-impacto',
    estadoDeValidacion: 'validada',
    confianzaAutomatica: 0.94,
    contextoMinimo: 'Resultado concreto del rediseño, con el antes y el después en pantalla.',
  },
  {
    id: 'fch-zul-03-04',
    idConferencia: 'cnf-zul-03',
    fragmento:
      'Llevamos a los talleres el formulario impreso tal como existía, con todos sus veintiocho campos, y les pedimos a los participantes que tacharan directamente sobre el papel lo que les parecía innecesario o confuso, en vez de mostrarles de entrada un prototipo ya rediseñado por nosotros. Esa decisión metodológica cambió la dinámica por completo: la gente discute con más libertad tachando algo existente que opinando sobre una propuesta ajena que siente que ya viene decidida.',
    hablante: 'Natalia Bermúdez Arango',
    segundoInicio: 1235,
    segundoFin: 1259,
    idTema: 'tem-participacion-ciudadana',
    tipoDeUnidad: 'estrategia',
    estadoDeValidacion: 'validada',
    confianzaAutomatica: 0.9,
    contextoMinimo: 'Detalle de la técnica usada en el segundo taller.',
  },
  {
    id: 'fch-zul-03-05',
    idConferencia: 'cnf-zul-03',
    fragmento:
      'Un taller donde la administración llega con la solución hecha no es participación, es socialización.',
    hablante: 'Natalia Bermúdez Arango',
    segundoInicio: 1610,
    segundoFin: 1630,
    idTema: 'tem-participacion-ciudadana',
    tipoDeUnidad: 'postura',
    estadoDeValidacion: 'pendiente',
    confianzaAutomatica: 0.65,
    contextoMinimo: 'Respuesta a una pregunta sobre experiencias previas fallidas.',
  },
  {
    id: 'fch-zul-03-06',
    idConferencia: 'cnf-zul-03',
    fragmento:
      'Estamos replicando el método de codiseño en dos trámites municipales más, esta vez con el propio equipo de la alcaldía facilitando los talleres directamente, con nuestro acompañamiento como soporte metodológico más que como conductores del proceso. La meta de esta fase es que el método quede instalado como capacidad interna de la administración, no como algo que depende de que nosotros volvamos cada vez.',
    hablante: 'Natalia Bermúdez Arango',
    segundoInicio: 2020,
    segundoFin: 2043,
    idTema: 'tem-participacion-ciudadana',
    tipoDeUnidad: 'fase-del-trabajo',
    estadoDeValidacion: 'automatica',
    confianzaAutomatica: 0.81,
    contextoMinimo: 'Estado actual del trabajo, antes de las conclusiones.',
  },

  /* cnf-pen-01: Series de tiempo aplicadas a la demanda de transporte urbano */
  {
    id: 'fch-pen-01-01',
    idConferencia: 'cnf-pen-01',
    fragmento:
      'Usamos dos años completos de validaciones de tarjeta, agregadas por estación y por franja de quince minutos, sin ninguna encuesta de por medio: todo el análisis parte de datos transaccionales que el sistema ya generaba de todas formas. Esa decisión evitó el costo y el sesgo de una encuesta de movilidad, pero también significó que tuvimos que inferir el propósito del viaje a partir de patrones de uso, en vez de preguntarlo directamente.',
    hablante: 'Tomás Iriarte Villalba',
    segundoInicio: 175,
    segundoFin: 199,
    idTema: 'tem-analitica-predictiva',
    tipoDeUnidad: 'metodo',
    estadoDeValidacion: 'validada',
    confianzaAutomatica: 0.92,
    contextoMinimo: 'Descripción de la fuente de datos, al abrir la charla.',
  },
  {
    id: 'fch-pen-01-02',
    idConferencia: 'cnf-pen-01',
    fragmento:
      'Sin marcar los días atípicos en el modelo, el error del pronóstico se duplicaba de forma consistente en las dos semanas siguientes a cada evento masivo en la ciudad, ya fuera un concierto, un partido o un cierre vial prolongado. El modelo aprendía esos picos como si fueran parte del patrón normal, y luego los proyectaba hacia adelante donde no correspondía, contaminando el pronóstico de días completamente ordinarios.',
    hablante: 'Tomás Iriarte Villalba',
    segundoInicio: 520,
    segundoFin: 545,
    idTema: 'tem-analitica-predictiva',
    tipoDeUnidad: 'dato-de-impacto',
    estadoDeValidacion: 'validada',
    confianzaAutomatica: 0.91,
    contextoMinimo: 'Hallazgo principal, con la serie de error en pantalla.',
  },
  {
    id: 'fch-pen-01-03',
    idConferencia: 'cnf-pen-01',
    fragmento: 'Un modelo que no sabe qué días son raros aprende que lo raro es normal.',
    hablante: 'Tomás Iriarte Villalba',
    segundoInicio: 880,
    segundoFin: 895,
    idTema: 'tem-analitica-predictiva',
    tipoDeUnidad: 'cita-textual',
    estadoDeValidacion: 'automatica',
    confianzaAutomatica: 0.8,
    contextoMinimo: 'Frase de síntesis antes de presentar la corrección aplicada.',
  },
  {
    id: 'fch-pen-01-04',
    idConferencia: 'cnf-pen-01',
    fragmento:
      'Incorporamos un calendario de eventos de la ciudad como variable externa al modelo, construido a partir de permisos de aforo público y anuncios oficiales, y el error del pronóstico en los días posteriores a un evento volvió al nivel de un día ordinario. Mantener ese calendario actualizado terminó siendo, de forma inesperada, más trabajo operativo que ajustar el modelo en sí.',
    hablante: 'Tomás Iriarte Villalba',
    segundoInicio: 1290,
    segundoFin: 1315,
    idTema: 'tem-analitica-predictiva',
    tipoDeUnidad: 'estrategia',
    estadoDeValidacion: 'validada',
    confianzaAutomatica: 0.89,
    contextoMinimo: 'Solución adoptada, con la comparación de errores antes y después.',
  },
]

/*
  Las que llevan condensado, por id.

  Son las dos que de verdad lo necesitan: la primera repite el mismo giro tres
  veces y la segunda explica el protocolo dos veces seguidas. El resto del
  fixture está escrito como se escribe, no como se habla, y condensarlas sería
  inventar una diferencia que en los datos reales no estaría.
*/
const CONDENSADOS: Readonly<Record<string, string>> = {
  'fch-alc-01-01': 'No le piden al modelo que decida si un artículo entra en la revisión, sino que ordene la pila por probabilidad de relevancia: la exclusión sigue siendo de una persona. No es un clasificador binario que haya que auditar por sesgo, es un lector rápido que prioriza el trabajo de un lector humano.',
  'fch-alc-01-02': 'El protocolo fue de dos pasadas ciegas sobre el mismo lote de resúmenes, con una tercera revisión humana solo cuando discrepaban o algo quedaba dudoso. Eso permitió medir el acuerdo entre revisores desde el primer lote y detectar que dos criterios de inclusión estaban redactados de forma ambigua.',
}

export const FICHAS_DE_EJEMPLO: readonly Ficha[] = SIN_CONDENSAR.map((ficha) => ({
  ...ficha,
  condensado: CONDENSADOS[ficha.id] ?? '',
}))
