import { useCallback, useEffect, useState } from 'react'
import type { Evento, Ponente } from '../data'
import { crearEvento, crearPonente } from './directorio'
import type { ResultadoEvento, ResultadoPonente } from './directorio'
import {
  crearEventoRemoto,
  crearPonenteRemoto,
  eliminarEventoRemoto,
  eliminarPonenteRemoto,
  listarDirectorio,
} from './repositorio'

/*
  Directorio compartido de eventos y ponentes (B10).

  Antes en sessionStorage; ahora de las tablas `eventos`/`ponentes`. No hay
  `idUsuario`: es del grupo, no de nadie.

  Las reglas puras de `directorio.ts` validan antes del viaje (nombre vacío,
  muy largo, repetido dentro del mismo evento) para dar el mensaje con nombre
  propio; Postgres no tiene una restricción `unique` sobre el nombre, así que
  esa comprobación previa es la única que atrapa el duplicado — se hace sobre
  la lista ya cargada.
*/

export type ValorDeDirectorio = {
  readonly eventos: readonly Evento[]
  readonly ponentes: readonly Ponente[]
  readonly cargando: boolean
  readonly crearEvento: (nombre: string) => Promise<ResultadoEvento>
  readonly crearPonente: (idEvento: string, nombre: string) => Promise<ResultadoPonente>
  /**
   * Quitar del directorio. Solo retira la sugerencia: las conferencias ya
   * cargadas guardan el nombre como texto y no cambian (ver el repositorio).
   * Borrar un evento se lleva sus ponentes.
   */
  readonly eliminarEvento: (idEvento: string) => Promise<void>
  readonly eliminarPonente: (idPonente: string) => Promise<void>
}

export function useDirectorio(): ValorDeDirectorio {
  const [eventos, setEventos] = useState<readonly Evento[]>([])
  const [ponentes, setPonentes] = useState<readonly Ponente[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let cancelado = false

    listarDirectorio().then((respuesta) => {
      if (cancelado) return
      if (respuesta.ok) {
        setEventos(respuesta.datos.eventos)
        setPonentes(respuesta.datos.ponentes)
      }
      setCargando(false)
    })

    return () => {
      cancelado = true
    }
  }, [])

  const crearEventoNuevo = useCallback(
    async (nombre: string): Promise<ResultadoEvento> => {
      const previo = crearEvento(eventos, nombre)
      if (!previo.ok) {
        return previo
      }

      const remoto = await crearEventoRemoto(nombre)
      if (!remoto.ok) {
        return { ok: false, codigo: remoto.codigo }
      }

      setEventos((anteriores) => [...anteriores, remoto.datos])
      return { ok: true, evento: remoto.datos }
    },
    [eventos],
  )

  const crearPonenteNuevo = useCallback(
    async (idEvento: string, nombre: string): Promise<ResultadoPonente> => {
      const previo = crearPonente(ponentes, idEvento, nombre)
      if (!previo.ok) {
        return previo
      }

      const remoto = await crearPonenteRemoto(idEvento, nombre)
      if (!remoto.ok) {
        return { ok: false, codigo: remoto.codigo }
      }

      setPonentes((anteriores) => [...anteriores, remoto.datos])
      return { ok: true, ponente: remoto.datos }
    },
    [ponentes],
  )

  /*
    Se quita de la lista antes de preguntar a la base: la ✓ ya se pulsó, y
    esperar al viaje dejaría la opción a la vista como si no se hubiera
    borrado. Si la base se niega, se vuelve a leer el directorio entero.
  */
  const eliminarEvento = useCallback(async (idEvento: string): Promise<void> => {
    setEventos((anteriores) => anteriores.filter((evento) => evento.id !== idEvento))
    setPonentes((anteriores) => anteriores.filter((ponente) => ponente.idEvento !== idEvento))

    const remoto = await eliminarEventoRemoto(idEvento)
    if (!remoto.ok) {
      const releido = await listarDirectorio()
      if (releido.ok) {
        setEventos(releido.datos.eventos)
        setPonentes(releido.datos.ponentes)
      }
    }
  }, [])

  const eliminarPonente = useCallback(async (idPonente: string): Promise<void> => {
    setPonentes((anteriores) => anteriores.filter((ponente) => ponente.id !== idPonente))

    const remoto = await eliminarPonenteRemoto(idPonente)
    if (!remoto.ok) {
      const releido = await listarDirectorio()
      if (releido.ok) {
        setPonentes(releido.datos.ponentes)
      }
    }
  }, [])

  return {
    eventos,
    ponentes,
    cargando,
    crearEvento: crearEventoNuevo,
    crearPonente: crearPonenteNuevo,
    eliminarEvento,
    eliminarPonente,
  }
}
