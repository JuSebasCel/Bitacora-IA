import type { CampoDeMarcador, FormatoDeMarcador, OrigenDeMarcador } from './tipos'

/*
  Metadata fija de los cinco campos del repositorio que un marcador puede
  citar (PLAN.md sección 5.6). No es un directorio creable como Evento/Ponente
  — son campos definidos por el propio sistema, no vocabulario libre. Una
  plantilla puede además definir marcadores con una etiqueta personalizada de
  texto libre (`OrigenDeMarcador` de tipo `personalizado`) para lo que ningún
  campo fijo cubre — ver `resolverMarcador` más abajo.
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

export const ETIQUETAS_DE_FORMATO: Record<FormatoDeMarcador, string> = {
  parrafo: 'Párrafo',
  lista_vinetas: 'Lista con viñetas',
  lista_numerada: 'Lista numerada',
}

export const ETIQUETAS_DE_MODO_DE_SECCION = {
  condicional: 'Sección condicional',
  repetible: 'Sección repetible',
} as const

type DatoDeEjemplo = {
  readonly parrafo: string
  readonly lista: readonly string[]
}

/*
  Contenido de muestra que el editor resuelve dentro de un marcador mientras
  se edita (PRD.md F4: "completamente editable, con datos de ejemplo"). No es
  el contenido real generado por el LLM — eso llega con B9.
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

/** Dato de ejemplo genérico para un marcador con etiqueta personalizada, sin fixture propio. */
function datoDeEjemploPersonalizado(etiqueta: string): DatoDeEjemplo {
  return {
    parrafo: `[Contenido de ejemplo para «${etiqueta}»]`,
    lista: [`Primer punto de «${etiqueta}»`, `Segundo punto de «${etiqueta}»`],
  }
}

/** Etiqueta legible de un origen, sea un campo fijo o una etiqueta personalizada. */
export function etiquetaDeOrigen(origen: OrigenDeMarcador): string {
  return origen.tipo === 'campo' ? ETIQUETAS_DE_CAMPO[origen.campo] : origen.etiqueta
}

function datoDeEjemplo(origen: OrigenDeMarcador): DatoDeEjemplo {
  return origen.tipo === 'campo' ? DATOS_DE_EJEMPLO[origen.campo] : datoDeEjemploPersonalizado(origen.etiqueta)
}

/** Resuelve el dato de muestra de un marcador según su origen y formato. */
export function resolverMarcador(
  origen: OrigenDeMarcador,
  formato: FormatoDeMarcador,
): string | readonly string[] {
  const dato = datoDeEjemplo(origen)

  return formato === 'parrafo' ? dato.parrafo : dato.lista
}

/** Arreglo de muestra para una sección repetible (`FOR` de `docx-templates`). */
export function resolverListaDeMarcador(origen: OrigenDeMarcador): readonly string[] {
  return datoDeEjemplo(origen).lista
}

/** Condición de muestra para una sección condicional (`IF` de `docx-templates`): siempre presente en datos de ejemplo. */
export function resolverCondicionDeMarcador(origen: OrigenDeMarcador): boolean {
  return datoDeEjemplo(origen).parrafo.trim().length > 0
}
