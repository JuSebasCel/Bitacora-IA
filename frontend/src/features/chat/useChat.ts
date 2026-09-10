import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useConferenciasVisibles } from '@/features/conferencias/components'
import { fichasDelCatalogo } from '@/features/conferencias/query'
import { useEtiquetas } from '@/features/conferencias/tags'
import { leerTaxonomia } from '@/features/taxonomia'
import { mensajeDeError } from '@/shared/errors'
import type { CodigoError } from '@/shared/errors'
import type { AlcanceDeConsulta, Conversacion, Mensaje, MensajeDeRespuesta, MensajeDeUsuario } from './data/tipos'
import { comandoDeEtiquetaEn, idsDeConferenciasCitadas } from './etiquetar'
import { construirGenerador, mensajeNuevoDeEvaluacion } from './fronteraDeGeneracion'
import { ordenarPorActividad } from './mapeo'
import { generacionCompleta, textoVisibleDe } from './progreso'
import {
  agregarMensaje,
  cambiarAlcanceDeConversacion,
  crearConversacion,
  eliminarConversacion,
  eliminarMensajesPosterioresA,
  listarConversaciones,
  listarMensajes,
  reemplazarContenidoDeMensaje,
  renombrarConversacion,
} from './repositorio'

/*
  Estado del chat de quien tiene la sesión abierta. Envoltorio fino sobre tres
  piezas que se prueban sin React: el repositorio (persistencia real en
  Postgres, B7), la frontera de generación (de dónde sale una respuesta) y
  `mapeo.ts`/`progreso.ts` (las reglas puras). Este hook solo las conecta y
  guarda el estado que la interfaz necesita mirar.

  Todas las acciones son asíncronas porque ahora todas cruzan la red. Enviar un
  mensaje lo GUARDA: si la persona cierra el panel a mitad de una respuesta, lo
  que ya se escribió sigue ahí al volver, que es lo que `sessionStorage` nunca
  dio entre dispositivos ni entre sesiones.

  Desapareció con la migración el enredo que obligaba a `enviar` a construir la
  conversación nueva "inline": cuando la persistencia era un blob en
  `sessionStorage`, dos escrituras dentro de la misma función partían del mismo
  snapshot capturado en el render y la segunda pisaba a la primera. Ahora cada
  escritura es una fila independiente, el id lo asigna Postgres y la respuesta
  vuelve con la fila ya guardada, así que `enviar` puede sencillamente esperar a
  que la conversación exista antes de escribir el mensaje. El estado local se
  actualiza siempre con la forma funcional (`anteriores => ...`) por el mismo
  motivo de fondo: entre el `await` y la respuesta pudo cambiar cualquier cosa.
*/

export type ResultadoDeAccion = { readonly ok: true } | { readonly ok: false; readonly mensaje: string }

/** Mientras `Date.now() - inicioMs` no complete el texto, la burbuja lo revela por tiempo real, sin `setTimeout`. */
export type EstadoDeGeneracion = { readonly idMensaje: string; readonly inicioMs: number }

export type ValorDeChat = {
  readonly conversaciones: readonly Conversacion[]
  readonly conversacionActiva: Conversacion | null
  readonly mensajes: readonly Mensaje[]
  readonly generacion: EstadoDeGeneracion | null
  /** El índice de conversaciones todavía viaja: sin esto la lista parpadea "no hay ninguna" antes de existir. */
  readonly cargando: boolean
  /** El hilo de la conversación elegida todavía viaja. Distinto del anterior: la lista ya está y el hilo no. */
  readonly cargandoMensajes: boolean
  /** Hay una pregunta esperando respuesta. Es el hueco que abre la frontera de generación: con el backend real, entre preguntar y recibir hay red de por medio. */
  readonly respondiendo: boolean
  /** Último fallo, ya traducido a un mensaje del catálogo. Nunca detalle técnico. */
  readonly error: string | null
  readonly crear: () => Promise<ResultadoDeAccion>
  readonly seleccionar: (idConversacion: string) => void
  readonly renombrar: (idConversacion: string, titulo: string) => Promise<ResultadoDeAccion>
  readonly eliminar: (idConversacion: string) => Promise<ResultadoDeAccion>
  readonly cambiarAlcance: (alcance: AlcanceDeConsulta) => Promise<ResultadoDeAccion>
  readonly enviar: (texto: string) => Promise<ResultadoDeAccion>
  readonly elegirAclaracion: (idMensaje: string, alcance: AlcanceDeConsulta) => Promise<ResultadoDeAccion>
  readonly editarYReenviar: (idMensaje: string, contenidoNuevo: string) => Promise<ResultadoDeAccion>
  readonly detener: () => Promise<ResultadoDeAccion>
  readonly finalizarGeneracion: () => void
  readonly etiquetarCitadas: (idMensaje: string, nombreEtiqueta: string) => Promise<ResultadoDeAccion>
}

const ALCANCE_POR_DEFECTO: AlcanceDeConsulta = { tipo: 'todas' }
const TITULO_POR_DEFECTO = 'Conversación nueva'

/*
  La última respuesta del hilo, que es sobre la que actúa el comando de
  etiquetar escrito en texto libre. Se filtra además por conversación aunque
  `mensajes` sea siempre el hilo activo: cuando `enviar` acaba de crear la
  conversación, el arreglo que ve todavía es el del hilo anterior —React no
  aplica el `setMensajes([])` a mitad de la misma función— y sin el filtro se
  etiquetarían las fichas de una conversación distinta.
*/
function ultimaRespuestaDe(mensajes: readonly Mensaje[], idConversacion: string): MensajeDeRespuesta | null {
  const respuestas = mensajes.filter(
    (mensaje): mensaje is MensajeDeRespuesta =>
      mensaje.rol === 'asistente' && mensaje.tipo === 'respuesta' && mensaje.idConversacion === idConversacion,
  )

  return respuestas.at(-1) ?? null
}

export function useChat(idUsuario: string): ValorDeChat {
  const { visibles, fichas } = useConferenciasVisibles(idUsuario)
  const etiquetas = useEtiquetas(idUsuario)

  const [conversaciones, setConversaciones] = useState<readonly Conversacion[]>([])
  const [mensajes, setMensajes] = useState<readonly Mensaje[]>([])
  const [idActiva, setIdActiva] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [cargandoMensajes, setCargandoMensajes] = useState(false)
  const [respondiendo, setRespondiendo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generacion, setGeneracion] = useState<EstadoDeGeneracion | null>(null)

  /*
    Qué hilo está ya en `mensajes`. Es una ref y no estado porque nadie lo
    dibuja: solo decide si el efecto de carga tiene algo que traer. Guardarlo en
    estado provocaría un render extra por conversación abierta sin cambiar un
    píxel.
  */
  const hiloCargado = useRef<string | null>(null)

  /*
    El catálogo sobre el que responde la simulación. Se memoriza para que el
    generador no cambie de identidad en cada render; cuando la generación pase
    al backend esto desaparece del hook, porque el agente real lee las fichas
    del lado del servidor (ver `fronteraDeGeneracion.ts`).
  */
  const todasLasEntradas = useMemo(
    () => fichasDelCatalogo(fichas, visibles),
    [fichas, visibles],
  )
  const temas = useMemo(() => leerTaxonomia().temas, [])
  const generar = useMemo(
    () => construirGenerador({ entradas: todasLasEntradas, temas }),
    [todasLasEntradas, temas],
  )

  const registrarFallo = useCallback((codigo: CodigoError): ResultadoDeAccion => {
    const mensaje = mensajeDeError(codigo)
    setError(mensaje)

    return { ok: false, mensaje }
  }, [])

  /*
    Todo camino feliz limpia el error anterior: un aviso de "no pudimos
    conectarnos" que sobrevive a la siguiente operación exitosa es peor que no
    haberlo mostrado, porque describe un mundo que ya cambió.
  */
  const exito = useCallback((): ResultadoDeAccion => {
    setError(null)

    return { ok: true }
  }, [])

  useEffect(() => {
    let cancelado = false

    setConversaciones([])
    setMensajes([])
    setIdActiva(null)
    setGeneracion(null)
    hiloCargado.current = null

    /*
      El panel se monta con el shell, antes de que la sesión resuelva, y
      entonces el id llega vacío. Consultar con un id vacío solo puede devolver
      cero filas: se ahorra el viaje y se deja el estado en "ya cargó, no hay
      nada", que es la verdad para quien todavía no tiene sesión.
    */
    if (idUsuario.trim().length === 0) {
      setCargando(false)
      return
    }

    setCargando(true)

    void listarConversaciones(idUsuario).then((resultado) => {
      if (cancelado) {
        return
      }

      if (resultado.ok) {
        setConversaciones(resultado.datos)
        setError(null)
      } else {
        setError(mensajeDeError(resultado.codigo))
      }

      setCargando(false)
    })

    return () => {
      cancelado = true
    }
  }, [idUsuario])

  useEffect(() => {
    /*
      Un hilo ya cargado no se vuelve a pedir: volver a una conversación que se
      acaba de mirar no debería costar un viaje, y en el caso de la conversación
      recién creada la consulta llegaría tarde y pisaría el primer mensaje.
    */
    if (idActiva === null || hiloCargado.current === idActiva) {
      return
    }

    let cancelado = false
    setCargandoMensajes(true)

    void listarMensajes(idActiva).then((resultado) => {
      if (cancelado) {
        return
      }

      if (resultado.ok) {
        hiloCargado.current = idActiva
        setMensajes(resultado.datos)
        setError(null)
      } else {
        setError(mensajeDeError(resultado.codigo))
      }

      setCargandoMensajes(false)
    })

    return () => {
      cancelado = true
    }
  }, [idActiva])

  const conversacionActiva = conversaciones.find((conversacion) => conversacion.id === idActiva) ?? null

  /*
    Un mensaje recién guardado entra al hilo y adelanta su conversación en el
    índice. La marca de tiempo que se copia es la del mensaje, no `Date.now()`:
    es exactamente la que el disparador de la tabla escribe en
    `actualizada_el`, así que la lista local queda ordenada igual que quedaría
    tras recargar.
  */
  const registrarMensaje = useCallback((mensaje: Mensaje): void => {
    /*
      Si la persona cambió de conversación mientras la respuesta viajaba, el
      mensaje ya quedó guardado y aparecerá al volver a ese hilo; lo que no se
      hace es meterlo en el hilo que está leyendo ahora.
    */
    if (hiloCargado.current === mensaje.idConversacion) {
      setMensajes((anteriores) => [...anteriores, mensaje])
    }

    setConversaciones((anteriores) =>
      ordenarPorActividad(
        anteriores.map((conversacion) =>
          conversacion.id === mensaje.idConversacion
            ? { ...conversacion, actualizadaEl: mensaje.creadoEl }
            : conversacion,
        ),
      ),
    )
  }, [])

  const adoptarConversacionNueva = useCallback((conversacion: Conversacion): void => {
    setConversaciones((anteriores) => ordenarPorActividad([conversacion, ...anteriores]))
    hiloCargado.current = conversacion.id
    setMensajes([])
    setIdActiva(conversacion.id)
    setGeneracion(null)
  }, [])

  const crear = useCallback(async (): Promise<ResultadoDeAccion> => {
    const creada = await crearConversacion(idUsuario, TITULO_POR_DEFECTO, ALCANCE_POR_DEFECTO)

    if (!creada.ok) {
      return registrarFallo(creada.codigo)
    }

    adoptarConversacionNueva(creada.datos)

    return exito()
  }, [adoptarConversacionNueva, exito, idUsuario, registrarFallo])

  const seleccionar = useCallback((idConversacion: string): void => {
    setIdActiva(idConversacion)
    setGeneracion(null)
  }, [])

  const renombrar = useCallback(
    async (idConversacion: string, titulo: string): Promise<ResultadoDeAccion> => {
      const limpio = titulo.trim()

      if (limpio.length === 0) {
        return registrarFallo('CHAT_TITULO_REQUERIDO')
      }

      /*
        La lista local contiene exactamente lo que la política de acceso deja
        ver. Si el id no está ahí, la consulta no puede terminar de otra forma
        que en error: se responde con el nombre propio del caso en vez de gastar
        el viaje y traducir después un fallo genérico.
      */
      if (!conversaciones.some((conversacion) => conversacion.id === idConversacion)) {
        return registrarFallo('CHAT_CONVERSACION_NO_ENCONTRADA')
      }

      const renombrada = await renombrarConversacion(idConversacion, limpio)

      if (!renombrada.ok) {
        return registrarFallo(renombrada.codigo)
      }

      setConversaciones((anteriores) =>
        anteriores.map((conversacion) => (conversacion.id === idConversacion ? renombrada.datos : conversacion)),
      )

      return exito()
    },
    [conversaciones, exito, registrarFallo],
  )

  const eliminar = useCallback(
    async (idConversacion: string): Promise<ResultadoDeAccion> => {
      const eliminada = await eliminarConversacion(idConversacion)

      if (!eliminada.ok) {
        return registrarFallo(eliminada.codigo)
      }

      setConversaciones((anteriores) => anteriores.filter((conversacion) => conversacion.id !== idConversacion))

      /* Los mensajes los arrastra el `on delete cascade`; aquí solo hay que dejar de apuntar a lo que ya no existe. */
      if (idActiva === idConversacion) {
        hiloCargado.current = null
        setIdActiva(null)
        setMensajes([])
        setGeneracion(null)
      }

      return exito()
    },
    [exito, idActiva, registrarFallo],
  )

  const cambiarAlcance = useCallback(
    async (alcance: AlcanceDeConsulta): Promise<ResultadoDeAccion> => {
      if (conversacionActiva === null) {
        return registrarFallo('CHAT_CONVERSACION_NO_ENCONTRADA')
      }

      const actualizada = await cambiarAlcanceDeConversacion(conversacionActiva.id, alcance)

      if (!actualizada.ok) {
        return registrarFallo(actualizada.codigo)
      }

      setConversaciones((anteriores) =>
        anteriores.map((conversacion) =>
          conversacion.id === actualizada.datos.id ? actualizada.datos : conversacion,
        ),
      )

      return exito()
    },
    [conversacionActiva, exito, registrarFallo],
  )

  /*
    Un mismo camino para "enviar una pregunta nueva" y "responder tras aclarar":
    las dos piden una respuesta sobre un alcance y la guardan en la
    conversación; lo único que cambia es de dónde salen la pregunta y el
    alcance.
  */
  const responderSobre = useCallback(
    async (conversacion: Conversacion, pregunta: string): Promise<ResultadoDeAccion> => {
      setRespondiendo(true)

      const generado = await generar({
        idConversacion: conversacion.id,
        pregunta,
        alcance: conversacion.alcance,
      })

      setRespondiendo(false)

      if (!generado.ok) {
        return registrarFallo(generado.codigo)
      }

      const guardado = await agregarMensaje(conversacion.id, mensajeNuevoDeEvaluacion(generado.datos))

      if (!guardado.ok) {
        return registrarFallo(guardado.codigo)
      }

      registrarMensaje(guardado.datos)

      /*
        El revelado letra por letra solo tiene sentido sobre el hilo que se está
        mirando: si la persona ya se fue a otra conversación, la respuesta queda
        guardada completa y se lee de una vez cuando vuelva.
      */
      if (
        guardado.datos.rol === 'asistente' &&
        guardado.datos.tipo === 'respuesta' &&
        hiloCargado.current === conversacion.id
      ) {
        setGeneracion({ idMensaje: guardado.datos.id, inicioMs: Date.now() })
      }

      return exito()
    },
    [exito, generar, registrarFallo, registrarMensaje],
  )

  /*
    Punto único donde una etiqueta se crea y se asigna a las conferencias de
    origen de unas fichas citadas — lo usan tanto el botón explícito
    (`etiquetarCitadas`) como el reconocimiento de patrón en texto libre dentro
    de `enviar`, para no duplicar la regla en dos sitios.
  */
  const etiquetarPorIds = useCallback(
    (idsFichasCitadas: readonly string[], nombreEtiqueta: string): ResultadoDeAccion => {
      if (idsFichasCitadas.length === 0) {
        return registrarFallo('CHAT_ETIQUETA_SIN_FICHAS_CITADAS')
      }

      const resultadoCrear = etiquetas.crear(nombreEtiqueta)
      if (!resultadoCrear.ok) {
        return registrarFallo(resultadoCrear.codigo)
      }

      for (const idConferencia of idsDeConferenciasCitadas(idsFichasCitadas, todasLasEntradas)) {
        etiquetas.asignar(resultadoCrear.etiqueta.id, idConferencia)
      }

      return exito()
    },
    [etiquetas, exito, registrarFallo, todasLasEntradas],
  )

  const enviar = useCallback(
    async (texto: string): Promise<ResultadoDeAccion> => {
      const limpio = texto.trim()

      if (limpio.length === 0) {
        return registrarFallo('CHAT_MENSAJE_VACIO')
      }

      /*
        Escribir sin haber creado una conversación crea una: es el camino normal
        de la primera pregunta, y obligar a un clic previo en "Nueva
        conversación" sería un trámite que no aporta ninguna decisión.
      */
      let conversacion = conversacionActiva

      if (conversacion === null) {
        const creada = await crearConversacion(idUsuario, TITULO_POR_DEFECTO, ALCANCE_POR_DEFECTO)

        if (!creada.ok) {
          return registrarFallo(creada.codigo)
        }

        conversacion = creada.datos
        adoptarConversacionNueva(conversacion)
      }

      const guardado = await agregarMensaje(conversacion.id, { rol: 'usuario', contenido: limpio })

      if (!guardado.ok) {
        return registrarFallo(guardado.codigo)
      }

      registrarMensaje(guardado.datos)

      const nombreEtiqueta = comandoDeEtiquetaEn(limpio)
      if (nombreEtiqueta !== null) {
        const anterior = ultimaRespuestaDe(mensajes, conversacion.id)

        if (anterior !== null) {
          etiquetarPorIds(anterior.idsFichasCitadas, nombreEtiqueta)
        }
      }

      return responderSobre(conversacion, limpio)
    },
    [
      adoptarConversacionNueva,
      conversacionActiva,
      etiquetarPorIds,
      idUsuario,
      mensajes,
      registrarFallo,
      registrarMensaje,
      responderSobre,
    ],
  )

  const elegirAclaracion = useCallback(
    async (idMensaje: string, alcance: AlcanceDeConsulta): Promise<ResultadoDeAccion> => {
      const mensaje = mensajes.find((candidato) => candidato.id === idMensaje)

      if (mensaje === undefined || conversacionActiva === null) {
        return registrarFallo('CHAT_MENSAJE_NO_ENCONTRADO')
      }

      const preguntaOriginal = mensajes
        .filter((candidato): candidato is MensajeDeUsuario => candidato.rol === 'usuario')
        .at(-1)

      if (preguntaOriginal === undefined) {
        return registrarFallo('CHAT_MENSAJE_NO_ENCONTRADO')
      }

      /*
        Elegir una opción de aclaración cambia el alcance de la conversación, no
        solo el de esta respuesta: la persona acotó, y lo que siga preguntando
        debería quedarse acotado hasta que diga otra cosa.
      */
      const actualizada = await cambiarAlcanceDeConversacion(conversacionActiva.id, alcance)

      if (!actualizada.ok) {
        return registrarFallo(actualizada.codigo)
      }

      setConversaciones((anteriores) =>
        anteriores.map((conversacion) =>
          conversacion.id === actualizada.datos.id ? actualizada.datos : conversacion,
        ),
      )

      return responderSobre(actualizada.datos, preguntaOriginal.contenido)
    },
    [conversacionActiva, mensajes, registrarFallo, responderSobre],
  )

  const editarYReenviar = useCallback(
    async (idMensaje: string, contenidoNuevo: string): Promise<ResultadoDeAccion> => {
      const limpio = contenidoNuevo.trim()

      if (limpio.length === 0) {
        return registrarFallo('CHAT_MENSAJE_VACIO')
      }

      const original = mensajes.find((mensaje) => mensaje.id === idMensaje)

      if (original === undefined || original.rol !== 'usuario' || conversacionActiva === null) {
        return registrarFallo('CHAT_MENSAJE_NO_ENCONTRADO')
      }

      /*
        Primero se borra lo que venía después y solo entonces se reescribe la
        pregunta. Al revés, un fallo entre las dos escrituras dejaría la
        pregunta nueva encima de la respuesta vieja, que es una mentira de
        trazabilidad: parecería que esa respuesta responde a ese texto. En este
        orden, un fallo a mitad deja la conversación cortada pero coherente, y
        volver a pulsar "Reenviar" la termina.
      */
      const borrado = await eliminarMensajesPosterioresA(conversacionActiva.id, original.creadoEl)

      if (!borrado.ok) {
        return registrarFallo(borrado.codigo)
      }

      const actualizado = await reemplazarContenidoDeMensaje(idMensaje, limpio)

      if (!actualizado.ok) {
        return registrarFallo(actualizado.codigo)
      }

      setGeneracion(null)
      setMensajes((anteriores) => [
        ...anteriores.filter((mensaje) => mensaje.creadoEl < original.creadoEl),
        actualizado.datos,
      ])

      return responderSobre(conversacionActiva, limpio)
    },
    [conversacionActiva, mensajes, registrarFallo, responderSobre],
  )

  const detener = useCallback(async (): Promise<ResultadoDeAccion> => {
    if (generacion === null) {
      return exito()
    }

    const enCurso = generacion
    setGeneracion(null)

    const mensaje = mensajes.find((candidato) => candidato.id === enCurso.idMensaje)

    if (mensaje === undefined || mensaje.rol !== 'asistente' || mensaje.tipo !== 'respuesta') {
      return exito()
    }

    /*
      Detener recorta el texto y lo guarda recortado: lo que la persona ve es lo
      que quedó dicho. Las citas no se tocan —siguen siendo las fichas que esa
      respuesta usó de verdad—, porque cortar la redacción no cambia de dónde
      salió la información.
    */
    const truncado = textoVisibleDe(mensaje.contenido, enCurso.inicioMs, Date.now())
    const guardado = await reemplazarContenidoDeMensaje(mensaje.id, truncado)

    if (!guardado.ok) {
      return registrarFallo(guardado.codigo)
    }

    setMensajes((anteriores) =>
      anteriores.map((candidato) => (candidato.id === guardado.datos.id ? guardado.datos : candidato)),
    )

    return exito()
  }, [exito, generacion, mensajes, registrarFallo])

  const finalizarGeneracion = useCallback((): void => {
    setGeneracion((actual) => {
      if (actual === null) {
        return null
      }

      const mensaje = mensajes.find((candidato) => candidato.id === actual.idMensaje)

      if (mensaje === undefined || mensaje.rol !== 'asistente' || mensaje.tipo !== 'respuesta') {
        return null
      }

      return generacionCompleta(mensaje.contenido, actual.inicioMs, Date.now()) ? null : actual
    })
  }, [mensajes])

  /*
    Es la única acción que hoy no toca la red: las etiquetas personales siguen
    en `sessionStorage` hasta que su propio dominio migre. Devuelve una promesa
    igual que las demás para que esa migración sea un cambio dentro de esta
    función y no un cambio de firma que se propague a cada botón que la llama.
  */
  const etiquetarCitadas = useCallback(
    async (idMensaje: string, nombreEtiqueta: string): Promise<ResultadoDeAccion> => {
      const mensaje = mensajes.find((candidato) => candidato.id === idMensaje)

      if (mensaje === undefined || mensaje.rol !== 'asistente' || mensaje.tipo !== 'respuesta') {
        return registrarFallo('CHAT_MENSAJE_NO_ENCONTRADO')
      }

      return etiquetarPorIds(mensaje.idsFichasCitadas, nombreEtiqueta)
    },
    [etiquetarPorIds, mensajes, registrarFallo],
  )

  return {
    conversaciones,
    conversacionActiva,
    mensajes,
    generacion,
    cargando,
    cargandoMensajes,
    respondiendo,
    error,
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
