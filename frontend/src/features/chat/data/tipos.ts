/*
  Tipos del chat trazable (F7).

  Sin conexión real a OpenAI todavía (F7 se queda simulado, igual que el
  resto de la fase frontend): la recuperación de fichas es real, sobre el
  mismo catálogo de F6, y lo que se simula es la redacción de la respuesta.
  Por eso `PasoDeRazonamiento` no es una narración inventada, es el reporte
  de lo que un filtro de verdad descartó y por qué — el chat no puede
  "pensar" nada que el pipeline no haya calculado de verdad.
*/

export type AlcanceDeConsulta =
  | { readonly tipo: 'todas' }
  | { readonly tipo: 'seleccion'; readonly idsConferencias: readonly string[] }
  | { readonly tipo: 'filtro'; readonly idTema: string | null; readonly palabraClave: string }

export type Conversacion = {
  readonly id: string
  readonly idUsuario: string
  readonly titulo: string
  readonly alcance: AlcanceDeConsulta
  readonly creadaEl: string
  readonly actualizadaEl: string
}

/** Un paso real del filtrado. `descartadas` puede venir recortada (ver MAX_DESCARTADAS_POR_PASO) si el paso descartó demasiadas para listarlas todas. */
export type PasoDeRazonamiento = {
  readonly descripcion: string
  readonly descartadas: readonly { readonly idFicha: string; readonly motivo: string }[]
  /** Cuántas se descartaron en total en este paso, aunque `descartadas` traiga menos. */
  readonly totalDescartadas: number
}

/*
  El alcance completo de reemplazo, no un parche parcial: `AlcanceDeConsulta`
  es una unión discriminada, y "parchear" un campo de un miembro sin saber en
  cuál de los tres se está parado no tipa de forma segura. Elegir una opción
  siempre reemplaza el alcance entero por uno concreto y válido.
*/
export type OpcionDeAclaracion = {
  readonly etiqueta: string
  readonly alcance: AlcanceDeConsulta
}

type CamposComunesDeMensaje = {
  readonly id: string
  readonly idConversacion: string
  readonly creadoEl: string
}

export type MensajeDeUsuario = CamposComunesDeMensaje & {
  readonly rol: 'usuario'
  readonly contenido: string
}

export type MensajeDeRespuesta = CamposComunesDeMensaje & {
  readonly rol: 'asistente'
  readonly tipo: 'respuesta'
  readonly contenido: string
  readonly idsFichasCitadas: readonly string[]
  readonly pasosDeRazonamiento: readonly PasoDeRazonamiento[]
}

export type MensajeDeAclaracion = CamposComunesDeMensaje & {
  readonly rol: 'asistente'
  readonly tipo: 'aclaracion'
  readonly pregunta: string
  readonly opciones: readonly OpcionDeAclaracion[]
}

export type Mensaje = MensajeDeUsuario | MensajeDeRespuesta | MensajeDeAclaracion

export type EspacioDeChat = {
  readonly conversaciones: readonly Conversacion[]
  readonly mensajes: readonly Mensaje[]
}

export const ESPACIO_DE_CHAT_VACIO: EspacioDeChat = {
  conversaciones: [],
  mensajes: [],
}
