/*
  Tipos del chat trazable (F7, persistido de verdad en B7).

  La redacción de la respuesta sigue simulada —la real la construye el agente
  conversacional del backend, y entra por `fronteraDeGeneracion.ts` sin tocar
  estos tipos—, pero la recuperación de fichas es real sobre el catálogo de F6.
  Por eso `PasoDeRazonamiento` no es una narración inventada, es el reporte de
  lo que un filtro de verdad descartó y por qué: el chat no puede "pensar" nada
  que el pipeline no haya calculado de verdad.

  Estos tipos son la forma del dominio, no la de la tabla. La traducción entre
  ambas vive completa en `mapeo.ts`, para que la unión discriminada de
  `Mensaje` no se filtre hacia la interfaz como un puñado de columnas
  opcionales.
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

/*
  Un mensaje todavía sin identidad: lo que el dominio compone antes de que
  Postgres le asigne `id` y `creado_el`. Se deriva de `Mensaje` en vez de
  redeclararse para que agregar un miembro a la unión (un tercer tipo de
  mensaje del asistente, por ejemplo) obligue a manejarlo también aquí; una
  copia a mano se olvidaría en silencio.

  El `T extends unknown` no es decorativo: sin esa cláusula condicional
  `Omit` colapsa la unión en un solo objeto con todos los campos opcionales
  —justo la forma aplanada que el `check` de la tabla prohíbe—, en vez de
  aplicarse miembro por miembro.
*/
type SinIdentidad<T> = T extends unknown ? Omit<T, 'id' | 'idConversacion' | 'creadoEl'> : never

export type MensajeNuevo = SinIdentidad<Mensaje>
