import { useCallback, useState } from 'react'
import { useConferenciasVisibles } from '@/features/conferencias/components'
import { FICHAS_DE_EJEMPLO } from '@/features/conferencias/data'
import { fichasDelCatalogo } from '@/features/conferencias/query'
import type { FichaDelCatalogo } from '@/features/conferencias/query'
import { useEtiquetas } from '@/features/conferencias/tags'
import { fichasConValidacionesAplicadas, leerValidaciones } from '@/features/conferencias/validacion'
import { leerTaxonomia } from '@/features/taxonomia'
import { mensajeDeError } from '@/shared/errors'
import { espacioDeChatDe, guardarEspacioDeChat } from './almacenamiento'
import { extraerCantidadSolicitada } from './cantidad'
import type { AlcanceDeConsulta, Conversacion, EspacioDeChat, Mensaje } from './data/tipos'
import { comandoDeEtiquetaEn, idsDeConferenciasCitadas } from './etiquetar'
import { evaluarPregunta } from './generarRespuesta'
import { generacionCompleta, textoVisibleDe } from './progreso'

/*
  Estado del chat de quien tiene la sesión abierta: conversaciones, mensajes,
  y la conversación activa. Envoltorio fino sobre `generarRespuesta.ts`
  (la recuperación) y `almacenamiento.ts` (la persistencia) — las reglas
  viven ahí, probadas sin React; este hook solo las conecta.
*/

export type ResultadoDeAccion = { readonly ok: true } | { readonly ok: false; readonly mensaje: string }

/** Mientras `Date.now() - inicioMs` no complete el texto, la burbuja lo revela por tiempo real, sin `setTimeout`. */
export type EstadoDeGeneracion = { readonly idMensaje: string; readonly inicioMs: number }

export type ValorDeChat = {
  readonly conversaciones: readonly Conversacion[]
  readonly conversacionActiva: Conversacion | null
  readonly mensajes: readonly Mensaje[]
  readonly generacion: EstadoDeGeneracion | null
  readonly crear: () => Conversacion
  readonly seleccionar: (idConversacion: string) => void
  readonly renombrar: (idConversacion: string, titulo: string) => ResultadoDeAccion
  readonly eliminar: (idConversacion: string) => void
  readonly cambiarAlcance: (alcance: AlcanceDeConsulta) => void
  readonly enviar: (texto: string) => ResultadoDeAccion
  readonly elegirAclaracion: (idMensaje: string, alcance: AlcanceDeConsulta) => void
  readonly editarYReenviar: (idMensaje: string, contenidoNuevo: string) => ResultadoDeAccion
  readonly detener: () => void
  readonly finalizarGeneracion: () => void
  readonly etiquetarCitadas: (idMensaje: string, nombreEtiqueta: string) => ResultadoDeAccion
}

function idAleatorio(prefijo: string): string {
  const uuid = globalThis.crypto?.randomUUID?.()
  if (uuid !== undefined) {
    return `${prefijo}-${uuid}`
  }

  return `${prefijo}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

const ALCANCE_POR_DEFECTO: AlcanceDeConsulta = { tipo: 'todas' }

export function useChat(idUsuario: string): ValorDeChat {
  const { visibles } = useConferenciasVisibles(idUsuario)
  const etiquetas = useEtiquetas(idUsuario)

  const [estado, setEstado] = useState<{ idUsuario: string; espacio: EspacioDeChat }>(() => ({
    idUsuario,
    espacio: espacioDeChatDe(idUsuario),
  }))
  const [idActiva, setIdActiva] = useState<string | null>(null)
  const [generacion, setGeneracion] = useState<EstadoDeGeneracion | null>(null)

  if (estado.idUsuario !== idUsuario) {
    setEstado({ idUsuario, espacio: espacioDeChatDe(idUsuario) })
    setIdActiva(null)
    setGeneracion(null)
  }

  const espacio = estado.idUsuario === idUsuario ? estado.espacio : espacioDeChatDe(idUsuario)

  const guardar = useCallback(
    (espacioNuevo: EspacioDeChat) => {
      guardarEspacioDeChat(idUsuario, espacioNuevo)
      setEstado({ idUsuario, espacio: espacioNuevo })
    },
    [idUsuario],
  )

  const todasLasEntradas: readonly FichaDelCatalogo[] = fichasDelCatalogo(
    fichasConValidacionesAplicadas(FICHAS_DE_EJEMPLO, leerValidaciones()),
    visibles,
  )
  const temas = leerTaxonomia().temas

  const conversacionActiva = espacio.conversaciones.find((conversacion) => conversacion.id === idActiva) ?? null
  const mensajes = conversacionActiva === null ? [] : espacio.mensajes.filter((mensaje) => mensaje.idConversacion === conversacionActiva.id)

  const crear = useCallback((): Conversacion => {
    const ahora = new Date().toISOString()
    const nueva: Conversacion = {
      id: idAleatorio('conv'),
      idUsuario,
      titulo: 'Conversación nueva',
      alcance: ALCANCE_POR_DEFECTO,
      creadaEl: ahora,
      actualizadaEl: ahora,
    }

    guardar({ ...espacio, conversaciones: [...espacio.conversaciones, nueva] })
    setIdActiva(nueva.id)

    return nueva
  }, [espacio, guardar, idUsuario])

  const seleccionar = useCallback((idConversacion: string): void => {
    setIdActiva(idConversacion)
    setGeneracion(null)
  }, [])

  const renombrar = useCallback(
    (idConversacion: string, titulo: string): ResultadoDeAccion => {
      const limpio = titulo.trim()

      if (limpio.length === 0) {
        return { ok: false, mensaje: mensajeDeError('CHAT_TITULO_REQUERIDO') }
      }

      if (!espacio.conversaciones.some((conversacion) => conversacion.id === idConversacion)) {
        return { ok: false, mensaje: mensajeDeError('CHAT_CONVERSACION_NO_ENCONTRADA') }
      }

      guardar({
        ...espacio,
        conversaciones: espacio.conversaciones.map((conversacion) =>
          conversacion.id === idConversacion ? { ...conversacion, titulo: limpio } : conversacion,
        ),
      })

      return { ok: true }
    },
    [espacio, guardar],
  )

  /*
    Eliminar se lleva también los mensajes de esa conversación: un mensaje
    sin conversación no tiene dónde vivir, y dejarlo huérfano en
    `sessionStorage` no lo mostraría en ningún lado, solo ocuparía espacio.
    Si era la conversación activa, se limpia `idActiva` para no dejar la
    pantalla apuntando a algo que ya no existe.
  */
  const eliminar = useCallback(
    (idConversacion: string): void => {
      guardar({
        conversaciones: espacio.conversaciones.filter((conversacion) => conversacion.id !== idConversacion),
        mensajes: espacio.mensajes.filter((mensaje) => mensaje.idConversacion !== idConversacion),
      })

      if (idActiva === idConversacion) {
        setIdActiva(null)
        setGeneracion(null)
      }
    },
    [espacio, guardar, idActiva],
  )

  const cambiarAlcance = useCallback(
    (alcance: AlcanceDeConsulta): void => {
      if (conversacionActiva === null) {
        return
      }

      guardar({
        ...espacio,
        conversaciones: espacio.conversaciones.map((conversacion) =>
          conversacion.id === conversacionActiva.id ? { ...conversacion, alcance } : conversacion,
        ),
      })
    },
    [conversacionActiva, espacio, guardar],
  )

  /*
    Un mismo camino para "enviar una pregunta nueva" y "responder tras
    aclarar": las dos terminan corriendo `evaluarPregunta` sobre un alcance y
    agregando el resultado a la conversación, la única diferencia es de dónde
    sale la pregunta y el alcance.
  */
  const responderSobre = useCallback(
    (idConversacion: string, pregunta: string, alcance: AlcanceDeConsulta, espacioBase: EspacioDeChat): void => {
      const cantidad = extraerCantidadSolicitada(pregunta)
      const resultado = evaluarPregunta(pregunta, alcance, todasLasEntradas, temas, cantidad)
      const ahora = new Date().toISOString()

      const mensajeAsistente: Mensaje =
        resultado.tipo === 'respuesta'
          ? {
              id: idAleatorio('msg'),
              idConversacion,
              rol: 'asistente',
              tipo: 'respuesta',
              contenido: resultado.contenido,
              creadoEl: ahora,
              idsFichasCitadas: resultado.idsFichasCitadas,
              pasosDeRazonamiento: resultado.pasosDeRazonamiento,
            }
          : {
              id: idAleatorio('msg'),
              idConversacion,
              rol: 'asistente',
              tipo: 'aclaracion',
              pregunta: resultado.pregunta,
              opciones: resultado.opciones,
              creadoEl: ahora,
            }

      guardar({
        ...espacioBase,
        mensajes: [...espacioBase.mensajes, mensajeAsistente],
        conversaciones: espacioBase.conversaciones.map((conversacion) =>
          conversacion.id === idConversacion ? { ...conversacion, actualizadaEl: ahora } : conversacion,
        ),
      })

      if (mensajeAsistente.rol === 'asistente' && mensajeAsistente.tipo === 'respuesta') {
        setGeneracion({ idMensaje: mensajeAsistente.id, inicioMs: Date.now() })
      }
    },
    [guardar, temas, todasLasEntradas],
  )

  /*
    Punto único donde una etiqueta se crea y se asigna a las conferencias de
    origen de unas fichas citadas — lo usan tanto el botón explícito
    (`etiquetarCitadas`) como el reconocimiento de patrón en texto libre
    dentro de `enviar`, para no duplicar la regla en dos sitios.
  */
  const etiquetarPorIds = useCallback(
    (idsFichasCitadas: readonly string[], nombreEtiqueta: string): ResultadoDeAccion => {
      if (idsFichasCitadas.length === 0) {
        return { ok: false, mensaje: mensajeDeError('CHAT_ETIQUETA_SIN_FICHAS_CITADAS') }
      }

      const resultadoCrear = etiquetas.crear(nombreEtiqueta)
      if (!resultadoCrear.ok) {
        return { ok: false, mensaje: mensajeDeError(resultadoCrear.codigo) }
      }

      for (const idConferencia of idsDeConferenciasCitadas(idsFichasCitadas, todasLasEntradas)) {
        etiquetas.asignar(resultadoCrear.etiqueta.id, idConferencia)
      }

      return { ok: true }
    },
    [etiquetas, todasLasEntradas],
  )

  /*
    `crear` guarda por su cuenta (para que el botón "Nueva conversación" la
    deje lista de un clic). `enviar` NO la llama: si lo hiciera, el `guardar`
    de `crear` y el `guardar` que agrega el mensaje del usuario partirían del
    mismo `espacio` capturado al render (React no aplica el primer `guardar`
    a mitad de la misma función), y el segundo pisaría al primero, borrando
    la conversación que se acababa de crear. Por eso, cuando hace falta una
    conversación nueva, `enviar` la arma inline y la mete en el MISMO
    `guardar` que agrega el mensaje — un solo escritor, un solo snapshot.
    Mismo bug, mismo arreglo, que ya tuvieron `useCatalogo`/`useMemorias` esta
    sesión con `setSearchParams`.
  */
  const enviar = useCallback(
    (texto: string): ResultadoDeAccion => {
      const limpio = texto.trim()

      if (limpio.length === 0) {
        return { ok: false, mensaje: mensajeDeError('CHAT_MENSAJE_VACIO') }
      }

      const ahora = new Date().toISOString()
      let conversacion = conversacionActiva
      let espacioBase = espacio

      if (conversacion === null) {
        conversacion = {
          id: idAleatorio('conv'),
          idUsuario,
          titulo: 'Conversación nueva',
          alcance: ALCANCE_POR_DEFECTO,
          creadaEl: ahora,
          actualizadaEl: ahora,
        }
        espacioBase = { ...espacio, conversaciones: [...espacio.conversaciones, conversacion] }
        setIdActiva(conversacion.id)
      }

      const mensajeUsuario: Mensaje = {
        id: idAleatorio('msg'),
        idConversacion: conversacion.id,
        rol: 'usuario',
        contenido: limpio,
        creadoEl: ahora,
      }

      const espacioConMensaje: EspacioDeChat = { ...espacioBase, mensajes: [...espacioBase.mensajes, mensajeUsuario] }
      guardar(espacioConMensaje)

      const nombreEtiqueta = comandoDeEtiquetaEn(limpio)
      if (nombreEtiqueta !== null) {
        const anterior = [...espacioBase.mensajes]
          .reverse()
          .find(
            (mensaje): mensaje is Extract<Mensaje, { tipo: 'respuesta' }> =>
              mensaje.rol === 'asistente' && mensaje.tipo === 'respuesta' && mensaje.idConversacion === conversacion!.id,
          )

        if (anterior !== undefined) {
          etiquetarPorIds(anterior.idsFichasCitadas, nombreEtiqueta)
        }
      }

      responderSobre(conversacion.id, limpio, conversacion.alcance, espacioConMensaje)

      return { ok: true }
    },
    [conversacionActiva, espacio, etiquetarPorIds, guardar, idUsuario, responderSobre],
  )

  /*
    Mismo criterio que `enviar`: el cambio de alcance se arma inline en vez
    de delegarlo a `cambiarAlcance` (que hace su propio `guardar`), para que
    la conversación con el alcance nuevo y la respuesta que sigue viajen en
    el mismo `espacio` y ninguna de las dos escrituras pise a la otra.
  */
  const elegirAclaracion = useCallback(
    (idMensaje: string, alcance: AlcanceDeConsulta): void => {
      const mensaje = espacio.mensajes.find((candidato) => candidato.id === idMensaje)
      if (mensaje === undefined || conversacionActiva === null) {
        return
      }

      const preguntaOriginal = [...espacio.mensajes]
        .filter((candidato) => candidato.idConversacion === conversacionActiva.id && candidato.rol === 'usuario')
        .at(-1)

      if (preguntaOriginal === undefined || preguntaOriginal.rol !== 'usuario') {
        return
      }

      const espacioConAlcanceNuevo: EspacioDeChat = {
        ...espacio,
        conversaciones: espacio.conversaciones.map((candidata) =>
          candidata.id === conversacionActiva.id ? { ...candidata, alcance } : candidata,
        ),
      }

      responderSobre(conversacionActiva.id, preguntaOriginal.contenido, alcance, espacioConAlcanceNuevo)
    },
    [conversacionActiva, espacio, responderSobre],
  )

  const editarYReenviar = useCallback(
    (idMensaje: string, contenidoNuevo: string): ResultadoDeAccion => {
      const limpio = contenidoNuevo.trim()
      if (limpio.length === 0) {
        return { ok: false, mensaje: mensajeDeError('CHAT_MENSAJE_VACIO') }
      }

      const original = espacio.mensajes.find((mensaje) => mensaje.id === idMensaje)
      if (original === undefined || original.rol !== 'usuario' || conversacionActiva === null) {
        return { ok: false, mensaje: mensajeDeError('CHAT_MENSAJE_NO_ENCONTRADO') }
      }

      /* Se corta desde el mensaje editado en adelante: la conversación no puede quedar con dos respuestas a la misma pregunta. */
      const mensajesAntes = espacio.mensajes.filter(
        (mensaje) => mensaje.idConversacion !== conversacionActiva.id || mensaje.creadoEl < original.creadoEl,
      )
      const mensajeEditado: Mensaje = { ...original, contenido: limpio }
      const espacioTruncado: EspacioDeChat = { ...espacio, mensajes: [...mensajesAntes, mensajeEditado] }

      guardar(espacioTruncado)
      responderSobre(conversacionActiva.id, limpio, conversacionActiva.alcance, espacioTruncado)

      return { ok: true }
    },
    [conversacionActiva, espacio, guardar, responderSobre],
  )

  const detener = useCallback((): void => {
    if (generacion === null) {
      return
    }

    const mensaje = espacio.mensajes.find((candidato) => candidato.id === generacion.idMensaje)
    if (mensaje !== undefined && mensaje.rol === 'asistente' && mensaje.tipo === 'respuesta') {
      const truncado = textoVisibleDe(mensaje.contenido, generacion.inicioMs, Date.now())
      guardar({
        ...espacio,
        mensajes: espacio.mensajes.map((candidato) => (candidato.id === mensaje.id ? { ...mensaje, contenido: truncado } : candidato)),
      })
    }

    setGeneracion(null)
  }, [espacio, generacion, guardar])

  const finalizarGeneracion = useCallback((): void => {
    setGeneracion((actual) => {
      if (actual === null) {
        return null
      }

      const mensaje = espacio.mensajes.find((candidato) => candidato.id === actual.idMensaje)
      if (mensaje === undefined || mensaje.rol !== 'asistente' || mensaje.tipo !== 'respuesta') {
        return null
      }

      return generacionCompleta(mensaje.contenido, actual.inicioMs, Date.now()) ? null : actual
    })
  }, [espacio.mensajes])

  const etiquetarCitadas = useCallback(
    (idMensaje: string, nombreEtiqueta: string): ResultadoDeAccion => {
      const mensaje = espacio.mensajes.find((candidato) => candidato.id === idMensaje)
      if (mensaje === undefined || mensaje.rol !== 'asistente' || mensaje.tipo !== 'respuesta') {
        return { ok: false, mensaje: mensajeDeError('CHAT_MENSAJE_NO_ENCONTRADO') }
      }

      return etiquetarPorIds(mensaje.idsFichasCitadas, nombreEtiqueta)
    },
    [espacio.mensajes, etiquetarPorIds],
  )

  return {
    conversaciones: espacio.conversaciones,
    conversacionActiva,
    mensajes,
    generacion,
    crear,
    seleccionar,
    renombrar,
    eliminar,
    cambiarAlcance,
    enviar,
    elegirAclaracion,
    editarYReenviar,
    detener,
    finalizarGeneracion,
    etiquetarCitadas,
  }
}
