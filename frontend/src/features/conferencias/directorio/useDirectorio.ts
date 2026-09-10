import { useCallback, useEffect, useState } from 'react'
import type { Evento, Ponente } from '../data'
import { crearEvento, crearPonente } from './directorio'
import type { ResultadoEvento, ResultadoPonente } from './directorio'
import { crearEventoRemoto, crearPonenteRemoto, listarDirectorio } from './repositorio'

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

  return {
    eventos,
    ponentes,
    cargando,
    crearEvento: crearEventoNuevo,
    crearPonente: crearPonenteNuevo,
  }
}
