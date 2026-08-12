import type { CampoDeMarcador } from './tipos'

/*
  Metadata fija de los cinco campos del repositorio que un marcador puede
  citar (PLAN.md sección 5.6). No es un directorio creable como Evento/Ponente
  — son campos definidos por el propio sistema, no vocabulario libre.
*/
export const CAMPOS_DE_MARCADOR: readonly CampoDeMarcador[] = [
  'tema_principal',
  'cita_destacada',
  'nombre_ponente',
  'fecha_evento',
  'resumen_metodo',
]

export const ETIQUETAS_DE_CAMPO: Record<CampoDeMarcador, string> = {
  tema_principal: 'Tema principal',
  cita_destacada: 'Cita destacada',
  nombre_ponente: 'Nombre del ponente',
  fecha_evento: 'Fecha del evento',
  resumen_metodo: 'Resumen del método',
}

type DatoDeEjemplo = {
  readonly parrafo: string
  readonly lista: readonly string[]
}

/*
  Contenido de muestra que el lienzo resuelve en un marcador mientras se
  edita (PRD.md F4: "completamente editable, con datos de ejemplo"). No es el
  contenido real generado por el LLM — eso llega con B9.
*/
export const DATOS_DE_EJEMPLO: Record<CampoDeMarcador, DatoDeEjemplo> = {
  tema_principal: {
    parrafo: 'Sesgos algorítmicos en modelos de predicción aplicados a políticas públicas.',
    lista: ['Sesgos algorítmicos', 'Modelos de predicción', 'Políticas públicas'],
  },
  cita_destacada: {
    parrafo: 'El dato nunca es neutral: refleja quién decidió qué preguntar.',
    lista: ['El dato nunca es neutral', 'Refleja quién decidió qué preguntar'],
  },
  nombre_ponente: {
    parrafo: 'Mariana Escobar Vallejo',
    lista: ['Mariana Escobar Vallejo'],
  },
  fecha_evento: {
    parrafo: '14 de mayo de 2026',
    lista: ['14 de mayo de 2026'],
  },
  resumen_metodo: {
    parrafo:
      'El equipo aplicó una metodología mixta, combinando entrevistas semiestructuradas con un análisis cuantitativo de registros administrativos para contrastar percepción y datos duros.',
    lista: [
      'Entrevistas semiestructuradas',
      'Análisis cuantitativo de registros administrativos',
      'Contraste entre percepción y datos duros',
    ],
  },
}
