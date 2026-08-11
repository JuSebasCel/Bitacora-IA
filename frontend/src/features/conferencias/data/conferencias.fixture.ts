import type { Conferencia } from './tipos'

/*
  Catálogo de conferencias de ejemplo para la fase 1.

  Existe porque F2 se construye sobre la interfaz antes de que haya backend
  (estrategia "frontend primero", PRD.md sección 1). Reproduce la forma exacta
  que tendrán los datos reales, incluida la propiedad por usuario y las
  opciones de privacidad de cada compartición.

  Cuando entre B6 este archivo SE BORRA, no se adapta: el catálogo real llega
  desde Supabase y las invariantes que hoy comprueba `conferencias.fixture.test.ts`
  pasan a ser responsabilidad del esquema y de las reglas de acceso por fila.

  Los dueños son las cuentas de `cuentas.fixture.ts`. Los ponentes son personas
  externas al grupo, como en un evento real; alguno repite charla, que es lo
  normal en un simposio y lo que hace demostrable la búsqueda por ponente.
*/

export const CONFERENCIAS_DE_EJEMPLO: readonly Conferencia[] = [
  {
    id: 'cnf-alc-01',
    titulo: 'Modelos de lenguaje aplicados a la revisión sistemática de literatura',
    ponente: 'Mariana Escobar Vallejo',
    evento: 'Simposio Andino de Investigación Aplicada',
    codigoDeEvento: 'SAIA-2026-01',
    fechaDelEvento: '2026-03-11',
    duracionEnSegundos: 2890,
    idDueno: 'usr-alcantara',
    estado: 'procesada',
    temaPrincipal: 'Modelos de lenguaje',
    resumen:
      'Recorrido por el uso de modelos de lenguaje para el cribado de títulos y resúmenes, con énfasis en dónde el criterio humano sigue siendo insustituible.',
    fuente: 'audio',
    comparticiones: [
      {
        idInvitado: 'usr-zuluaga',
        compartidaEl: '2026-03-19',
        privacidad: { compartirEtiquetas: true, compartirFichasPendientes: true },
      },
      {
        idInvitado: 'usr-penaloza',
        compartidaEl: '2026-04-02',
        privacidad: { compartirEtiquetas: false, compartirFichasPendientes: true },
      },
    ],
  },
  {
    id: 'cnf-alc-02',
    titulo: 'Trazabilidad de datos en estudios longitudinales de salud pública',
    ponente: 'Andrés Felipe Restrepo Ocampo',
    evento: 'Simposio Andino de Investigación Aplicada',
    codigoDeEvento: 'SAIA-2026-04',
    fechaDelEvento: '2026-03-12',
    duracionEnSegundos: 2410,
    idDueno: 'usr-alcantara',
    estado: 'procesada',
    temaPrincipal: 'Calidad de datos',
    resumen:
      'Cómo sostener la cadena de procedencia de una variable a lo largo de diez años de seguimiento, cuando cambian los instrumentos y el personal que los aplica.',
    fuente: 'transcripcion',
    comparticiones: [],
  },
  {
    id: 'cnf-alc-03',
    titulo: 'Sesgos algorítmicos en la asignación de subsidios',
    ponente: 'Lucía Ferreira Nogueira',
    evento: 'Coloquio de Ciencia de Datos del Norte',
    codigoDeEvento: 'CCDN-2026-02',
    fechaDelEvento: '2026-05-14',
    duracionEnSegundos: 3180,
    idDueno: 'usr-alcantara',
    estado: 'procesada',
    temaPrincipal: 'Sesgos algorítmicos',
    resumen:
      'Análisis de tres programas de transferencia condicionada donde el puntaje de focalización reprodujo desigualdades ya presentes en los registros de origen.',
    fuente: 'audio',
    comparticiones: [
      {
        idInvitado: 'usr-zuluaga',
        compartidaEl: '2026-05-28',
        privacidad: { compartirEtiquetas: false, compartirFichasPendientes: false },
      },
    ],
  },
  {
    id: 'cnf-alc-04',
    titulo: 'Anotación colaborativa de corpus orales en lenguas minoritarias',
    ponente: 'Tomás Iriarte Villalba',
    evento: 'Simposio Andino de Investigación Aplicada',
    codigoDeEvento: 'SAIA-2026-07',
    fechaDelEvento: '2026-03-13',
    duracionEnSegundos: 2650,
    idDueno: 'usr-alcantara',
    estado: 'procesando',
    temaPrincipal: 'Métodos de investigación',
    resumen:
      'Protocolo de anotación con hablantes nativos como jueces, y qué se pierde cuando la transcripción la hace alguien ajeno a la comunidad de habla.',
    fuente: 'audio',
    comparticiones: [],
  },
  {
    id: 'cnf-alc-05',
    titulo: 'Del prototipo al piloto: sensórica ambiental en cuencas andinas',
    ponente: 'Paula Andrea Cifuentes Mora',
    evento: 'Jornadas de Ingeniería y Sociedad',
    codigoDeEvento: 'JISO-2025-03',
    fechaDelEvento: '2025-10-08',
    duracionEnSegundos: 2075,
    idDueno: 'usr-alcantara',
    estado: 'procesada',
    temaPrincipal: 'Sensórica ambiental',
    resumen:
      'Cinco años de mediciones de caudal y turbidez con equipos de bajo costo, y las dos razones por las que la mitad de los nodos dejó de reportar.',
    fuente: 'transcripcion',
    comparticiones: [
      {
        idInvitado: 'usr-zuluaga',
        compartidaEl: '2026-01-22',
        privacidad: { compartirEtiquetas: true, compartirFichasPendientes: false },
      },
    ],
  },
  {
    id: 'cnf-ber-01',
    titulo: 'Gobernanza de datos abiertos en universidades públicas',
    ponente: 'Esteban Quiroga Lemus',
    evento: 'Simposio Andino de Investigación Aplicada',
    codigoDeEvento: 'SAIA-2026-02',
    fechaDelEvento: '2026-03-11',
    duracionEnSegundos: 2760,
    idDueno: 'usr-berrio',
    estado: 'procesada',
    temaPrincipal: 'Gobernanza de datos',
    resumen:
      'Qué hace falta para que una política de datos abiertos sobreviva al cambio de rectoría, más allá del repositorio y del acto administrativo que lo crea.',
    fuente: 'audio',
    comparticiones: [
      {
        idInvitado: 'usr-zuluaga',
        compartidaEl: '2026-04-06',
        privacidad: { compartirEtiquetas: false, compartirFichasPendientes: true },
      },
    ],
  },
  {
    id: 'cnf-ber-02',
    titulo: 'Evaluación de modelos de predicción de deserción estudiantil',
    ponente: 'Natalia Bermúdez Arango',
    evento: 'Coloquio de Ciencia de Datos del Norte',
    codigoDeEvento: 'CCDN-2026-05',
    fechaDelEvento: '2026-05-15',
    duracionEnSegundos: 2230,
    idDueno: 'usr-berrio',
    estado: 'procesada',
    temaPrincipal: 'Analítica predictiva',
    resumen:
      'Por qué una métrica agregada de exactitud oculta el error que importa, y cómo se ve el mismo modelo evaluado por cohorte de ingreso.',
    fuente: 'transcripcion',
    comparticiones: [],
  },
  {
    id: 'cnf-ber-03',
    titulo: 'Infraestructura de cómputo compartida entre grupos de investigación',
    ponente: 'Gabriel Ossa Trujillo',
    evento: 'Jornadas de Ingeniería y Sociedad',
    codigoDeEvento: 'JISO-2025-06',
    fechaDelEvento: '2025-10-09',
    duracionEnSegundos: 1980,
    idDueno: 'usr-berrio',
    estado: 'en-cola',
    temaPrincipal: 'Infraestructura de investigación',
    resumen:
      'Modelo de gobierno de un clúster compartido entre seis grupos, con reglas de prioridad acordadas antes de que apareciera la primera disputa por turnos.',
    fuente: 'audio',
    comparticiones: [],
  },
  {
    id: 'cnf-ber-04',
    titulo: 'Métodos mixtos en el estudio de adopción tecnológica rural',
    ponente: 'Daniela Marchena Solís',
    evento: 'Simposio Andino de Investigación Aplicada',
    codigoDeEvento: 'SAIA-2026-09',
    fechaDelEvento: '2026-03-13',
    duracionEnSegundos: 2540,
    idDueno: 'usr-berrio',
    estado: 'procesada',
    temaPrincipal: 'Métodos de investigación',
    resumen:
      'Combinación de encuesta panel y entrevistas en profundidad para explicar por qué la adopción declarada y la observada difieren de forma sistemática.',
    fuente: 'audio',
    comparticiones: [],
  },
  {
    id: 'cnf-zul-01',
    titulo: 'Calidad de datos en registros administrativos de salud',
    ponente: 'Mariana Escobar Vallejo',
    evento: 'Coloquio de Ciencia de Datos del Norte',
    codigoDeEvento: 'CCDN-2026-01',
    fechaDelEvento: '2026-05-14',
    duracionEnSegundos: 3320,
    idDueno: 'usr-zuluaga',
    estado: 'procesada',
    temaPrincipal: 'Calidad de datos',
    resumen:
      'Diagnóstico de completitud y consistencia sobre catorce millones de registros, y el costo real de limpiar lo que nunca se capturó bien en el punto de atención.',
    fuente: 'audio',
    comparticiones: [
      {
        idInvitado: 'usr-alcantara',
        compartidaEl: '2026-06-01',
        privacidad: { compartirEtiquetas: true, compartirFichasPendientes: true },
      },
    ],
  },
  {
    id: 'cnf-zul-02',
    titulo: 'Reproducibilidad computacional en publicaciones revisadas por pares',
    ponente: 'Ignacio Vergara Pinto',
    evento: 'Simposio Andino de Investigación Aplicada',
    codigoDeEvento: 'SAIA-2026-05',
    fechaDelEvento: '2026-03-12',
    duracionEnSegundos: 2180,
    idDueno: 'usr-zuluaga',
    estado: 'fallida',
    temaPrincipal: 'Reproducibilidad',
    resumen:
      'Intento de reejecutar el código de sesenta artículos publicados en revistas del área, con el detalle de en qué punto exacto se rompió cada uno.',
    fuente: 'audio',
    comparticiones: [],
  },
  {
    id: 'cnf-zul-03',
    titulo: 'Participación ciudadana en el diseño de sistemas públicos',
    ponente: 'Natalia Bermúdez Arango',
    evento: 'Jornadas de Ingeniería y Sociedad',
    codigoDeEvento: 'JISO-2025-01',
    fechaDelEvento: '2025-10-07',
    duracionEnSegundos: 2620,
    idDueno: 'usr-zuluaga',
    estado: 'procesada',
    temaPrincipal: 'Participación ciudadana',
    resumen:
      'Tres talleres de codiseño con usuarios de un trámite municipal, y cómo cambió el formulario cuando quienes lo llenan participaron en definirlo.',
    fuente: 'transcripcion',
    comparticiones: [],
  },
  {
    id: 'cnf-pen-01',
    titulo: 'Series de tiempo aplicadas a la demanda de transporte urbano',
    ponente: 'Tomás Iriarte Villalba',
    evento: 'Coloquio de Ciencia de Datos del Norte',
    codigoDeEvento: 'CCDN-2026-08',
    fechaDelEvento: '2026-05-16',
    duracionEnSegundos: 1840,
    idDueno: 'usr-penaloza',
    estado: 'procesada',
    temaPrincipal: 'Analítica predictiva',
    resumen:
      'Pronóstico de demanda por estación con datos de validación de tarjeta, y el efecto de los días atípicos sobre modelos entrenados sin marcarlos.',
    fuente: 'transcripcion',
    comparticiones: [],
  },
  {
    id: 'cnf-pen-02',
    titulo: 'Ética de la automatización en procesos de contratación',
    ponente: 'Gabriel Ossa Trujillo',
    evento: 'Jornadas de Ingeniería y Sociedad',
    codigoDeEvento: 'JISO-2025-04',
    fechaDelEvento: '2025-10-08',
    duracionEnSegundos: 2295,
    idDueno: 'usr-penaloza',
    estado: 'procesando',
    temaPrincipal: 'Ética y automatización',
    resumen:
      'Revisión de sistemas de preselección de hojas de vida en el sector público, con foco en qué decisiones quedan sin responsable identificable.',
    fuente: 'audio',
    comparticiones: [],
  },
]
