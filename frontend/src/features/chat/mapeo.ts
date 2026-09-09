import type {
  AlcanceDeConsulta,
  Conversacion,
  Mensaje,
  MensajeNuevo,
  OpcionDeAclaracion,
  PasoDeRazonamiento,
} from './data/tipos'

/*
  Traducción entre las filas de `conversaciones_chat`/`mensajes_chat` y los
  tipos del dominio.

  Vive fuera de `repositorio.ts` a propósito: es la parte que no depende de la
  red, así que se prueba fila por fila —incluida la fila torcida que ninguna
  prueba contra la base real provocaría— sin montar nada.

  Los guards de JSON no desaparecieron con `sessionStorage`: `alcance`,
  `pasos_de_razonamiento` y `opciones` son `jsonb`, y un `jsonb` llega al
  cliente tan sin tipar como llegaba una cadena de `sessionStorage`. Cambió de
  dónde viene el JSON, no cuánto se le puede creer.
*/

/*
  La lista de columnas y el tipo de la fila describen lo mismo, así que viven
  pegados: separarlos es exactamente por donde se cuela una columna que el tipo
  promete y la consulta nunca pidió (`undefined` en tiempo de ejecución, con un
  tipo que jura que está).
*/
export const COLUMNAS_DE_CONVERSACION = 'id, id_usuario, titulo, alcance, creada_el, actualizada_el'

export const COLUMNAS_DE_MENSAJE =
  'id, id_conversacion, rol, tipo, contenido, ids_fichas_citadas, pasos_de_razonamiento, pregunta, opciones, creado_el'

export type FilaDeConversacion = {
  readonly id: string
  readonly id_usuario: string
  readonly titulo: string
  readonly alcance: unknown
  readonly creada_el: string
  readonly actualizada_el: string
}

/*
  Todas las columnas propias de un rol concreto son anulables en la tabla: lo
  que garantiza que la combinación tenga sentido es el `check`
  `mensajes_chat_forma_segun_rol`, no el tipo de cada columna por separado. Por
  eso la fila se recibe floja y se estrecha aquí, en vez de fingir que Postgres
  devuelve ya la unión discriminada del dominio.
*/
export type FilaDeMensaje = {
  readonly id: string
  readonly id_conversacion: string
  readonly rol: string
  readonly tipo: string | null
  readonly contenido: string | null
  readonly ids_fichas_citadas: readonly string[] | null
  readonly pasos_de_razonamiento: unknown
  readonly pregunta: string | null
  readonly opciones: unknown
  readonly creado_el: string
}

/** Lo que viaja en un `insert`: sin `id` ni `creado_el`, que los pone Postgres. */
export type FilaDeMensajeNueva = {
  readonly id_conversacion: string
  readonly rol: 'usuario' | 'asistente'
  readonly tipo: 'respuesta' | 'aclaracion' | null
  readonly contenido: string | null
  readonly ids_fichas_citadas: readonly string[] | null
  readonly pasos_de_razonamiento: readonly PasoDeRazonamiento[] | null
  readonly pregunta: string | null
  readonly opciones: readonly OpcionDeAclaracion[] | null
}

function esAlcance(valor: unknown): valor is AlcanceDeConsulta {
  if (typeof valor !== 'object' || valor === null) {
    return false
  }

  const candidato = valor as Record<string, unknown>

  if (candidato['tipo'] === 'todas') {
    return true
  }

  if (candidato['tipo'] === 'seleccion') {
    const ids = candidato['idsConferencias']
    return Array.isArray(ids) && ids.every((id: unknown) => typeof id === 'string')
  }

  if (candidato['tipo'] === 'filtro') {
    return (
      (candidato['idTema'] === null || typeof candidato['idTema'] === 'string') &&
      typeof candidato['palabraClave'] === 'string'
    )
  }

  return false
}

function esDescarte(valor: unknown): boolean {
  if (typeof valor !== 'object' || valor === null) {
    return false
  }

  const candidato = valor as Record<string, unknown>

  return typeof candidato['idFicha'] === 'string' && typeof candidato['motivo'] === 'string'
}

function esPasoDeRazonamiento(valor: unknown): valor is PasoDeRazonamiento {
  if (typeof valor !== 'object' || valor === null) {
    return false
  }

  const candidato = valor as Record<string, unknown>
  const descartadas = candidato['descartadas']

  return (
    typeof candidato['descripcion'] === 'string' &&
    Array.isArray(descartadas) &&
    descartadas.every(esDescarte) &&
    typeof candidato['totalDescartadas'] === 'number'
  )
}

function esOpcionDeAclaracion(valor: unknown): valor is OpcionDeAclaracion {
  if (typeof valor !== 'object' || valor === null) {
    return false
  }

  const candidato = valor as Record<string, unknown>

  return typeof candidato['etiqueta'] === 'string' && esAlcance(candidato['alcance'])
}

function pasosDe(valor: unknown): readonly PasoDeRazonamiento[] {
  return Array.isArray(valor) ? valor.filter(esPasoDeRazonamiento) : []
}

function opcionesDe(valor: unknown): readonly OpcionDeAclaracion[] {
  return Array.isArray(valor) ? valor.filter(esOpcionDeAclaracion) : []
}

/*
  Un alcance ilegible no justifica esconder la conversación entera: los
  mensajes son lo que la persona vino a buscar, y el alcance es un filtro que
  puede volver a elegir de un clic. Se cae al mismo valor que la columna trae
  por defecto —el más amplio—, lo cual no abre nada que no estuviera ya
  abierto: quién ve qué conferencia lo decide la política de acceso por fila,
  nunca este campo.
*/
const ALCANCE_DE_RESPALDO: AlcanceDeConsulta = { tipo: 'todas' }

export function conversacionDeFila(fila: FilaDeConversacion): Conversacion {
  return {
    id: fila.id,
    idUsuario: fila.id_usuario,
    titulo: fila.titulo,
    alcance: esAlcance(fila.alcance) ? fila.alcance : ALCANCE_DE_RESPALDO,
    creadaEl: fila.creada_el,
    actualizadaEl: fila.actualizada_el,
  }
}

/*
  Devuelve `null` en vez de un mensaje a medias cuando la fila no encaja en
  ningún miembro de la unión. Con el `check` puesto eso no debería ocurrir
  nunca —esa es justamente su razón de ser—, pero el tipo de las columnas por
  sí solo admite la combinación imposible, y un `as` para taparlo convertiría
  una fila rota en una burbuja rota mucho más lejos, con la pila de llamadas ya
  perdida.
*/
export function mensajeDeFila(fila: FilaDeMensaje): Mensaje | null {
  const comunes = { id: fila.id, idConversacion: fila.id_conversacion, creadoEl: fila.creado_el }

  if (fila.rol === 'usuario') {
    return fila.contenido === null ? null : { ...comunes, rol: 'usuario', contenido: fila.contenido }
  }

  if (fila.rol !== 'asistente') {
    return null
  }

  if (fila.tipo === 'respuesta') {
    if (fila.contenido === null) {
      return null
    }

    return {
      ...comunes,
      rol: 'asistente',
      tipo: 'respuesta',
      contenido: fila.contenido,
      /*
        Esta línea es la trazabilidad entera: los ids exactos de las fichas que
        esta respuesta citó. `null` y `[]` significan lo mismo para el dominio
        (una respuesta puede no citar nada, como un "no encontré nada"), y
        colapsarlos aquí evita que cada consumidor tenga que preguntárselo. Lo
        que no se hace nunca es recortar, deduplicar ni reordenar la lista: un
        id que se cae aquí es una cita que la persona ya no puede seguir.
      */
      idsFichasCitadas: fila.ids_fichas_citadas ?? [],
      pasosDeRazonamiento: pasosDe(fila.pasos_de_razonamiento),
    }
  }

  if (fila.tipo === 'aclaracion') {
    return fila.pregunta === null
      ? null
      : {
          ...comunes,
          rol: 'asistente',
          tipo: 'aclaracion',
          pregunta: fila.pregunta,
          opciones: opcionesDe(fila.opciones),
        }
  }

  return null
}

/*
  El camino de vuelta. Se escriben SIEMPRE las nueve columnas, incluidos los
  `null` de las que no le tocan a este rol, en vez de omitirlas: el `check` no
  acepta un mensaje de usuario que además traiga `tipo`, ni una aclaración que
  arrastre el `contenido` de la respuesta anterior. Nombrar cada columna hace
  que la forma de la fila sea una decisión visible aquí, y no el residuo de lo
  que venía en el objeto que llegó.
*/
export function filaDeMensajeNuevo(idConversacion: string, nuevo: MensajeNuevo): FilaDeMensajeNueva {
  if (nuevo.rol === 'usuario') {
    return {
      id_conversacion: idConversacion,
      rol: 'usuario',
      tipo: null,
      contenido: nuevo.contenido,
      ids_fichas_citadas: null,
      pasos_de_razonamiento: null,
      pregunta: null,
      opciones: null,
    }
  }

  if (nuevo.tipo === 'respuesta') {
    return {
      id_conversacion: idConversacion,
      rol: 'asistente',
      tipo: 'respuesta',
      contenido: nuevo.contenido,
      ids_fichas_citadas: nuevo.idsFichasCitadas,
      pasos_de_razonamiento: nuevo.pasosDeRazonamiento,
      pregunta: null,
      opciones: null,
    }
  }

  return {
    id_conversacion: idConversacion,
    rol: 'asistente',
    tipo: 'aclaracion',
    contenido: null,
    ids_fichas_citadas: null,
    pasos_de_razonamiento: null,
    pregunta: nuevo.pregunta,
    opciones: nuevo.opciones,
  }
}

/*
  El índice de conversaciones se ordena por actividad y no por creación: en una
  lista larga lo que se busca es el hilo que se estaba hablando, y ordenar por
  `creada_el` deja al fondo justo la conversación en la que se está escribiendo
  ahora. El desempate por `id` no es cosmético: dos conversaciones pueden
  compartir marca de tiempo, y sin él el orden de la lista podría cambiar entre
  renders sin que nada haya cambiado.
*/
export function ordenarPorActividad(conversaciones: readonly Conversacion[]): readonly Conversacion[] {
  return [...conversaciones].sort((una, otra) => {
    if (una.actualizadaEl !== otra.actualizadaEl) {
      return una.actualizadaEl < otra.actualizadaEl ? 1 : -1
    }

    return una.id < otra.id ? 1 : -1
  })
}
