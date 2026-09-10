import { useCallback, useEffect, useState } from 'react'
import { mensajeDeError } from '@/shared/errors'
import { listarConferencias, listarFichasVisibles } from '../repositorio'
import { conferenciasVisibles } from '../query'
import type { ConferenciaVisible } from '../query'
import type { Ficha } from '../data'

/*
  Lo que una persona puede ver, con su estado de carga.

  Antes de B5 los datos venían de un fixture y del propio navegador. Ahora
  salen de dos consultas a Supabase que RLS ya filtró por identidad, así que
  el listado nunca trae una conferencia ajena aunque se pida `select('*')`
  sin condiciones. `conferenciasVisibles` sigue corriendo encima: dejó de ser
  la única puerta y pasó a derivar procedencia (propia o compartida) y
  privacidad efectiva sobre filas que Postgres ya autorizó — que la interfaz
  y la base de datos coincidan es lo que hace que un fallo en cualquiera de
  las dos se note.

  Las fichas visibles se traen en una sola consulta y no una por conferencia:
  el catálogo y el chat cruzan fichas de varias charlas a la vez.

  `recargar` sigue existiendo para que, tras cargar una conferencia nueva,
  quien la subió vea el listado al día sin refrescar la página.
*/

export type EstadoDeCarga = 'cargando' | 'listo'

export type ConferenciasVisibles = {
  readonly carga: EstadoDeCarga
  readonly visibles: readonly ConferenciaVisible[]
  readonly fichas: readonly Ficha[]
  /** Mensaje ya traducido si alguna de las dos consultas falló; null si todo fue bien. */
  readonly error: string | null
  readonly recargar: () => void
}

export function useConferenciasVisibles(idUsuario: string): ConferenciasVisibles {
  const [estado, setEstado] = useState<{
    carga: EstadoDeCarga
    visibles: readonly ConferenciaVisible[]
    fichas: readonly Ficha[]
    error: string | null
  }>({ carga: 'cargando', visibles: [], fichas: [], error: null })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let cancelado = false

    if (idUsuario === '') {
      setEstado({ carga: 'listo', visibles: [], fichas: [], error: null })
      return
    }

    setEstado((anterior) => ({ ...anterior, carga: 'cargando' }))

    Promise.all([listarConferencias(), listarFichasVisibles()]).then(
      ([conferencias, fichas]) => {
        if (cancelado) return

        if (!conferencias.ok) {
          setEstado({ carga: 'listo', visibles: [], fichas: [], error: mensajeDeError(conferencias.codigo) })
          return
        }

        setEstado({
          carga: 'listo',
          visibles: conferenciasVisibles(conferencias.datos, idUsuario),
          fichas: fichas.ok ? fichas.datos : [],
          error: fichas.ok ? null : mensajeDeError(fichas.codigo),
        })
      },
    )

    return () => {
      cancelado = true
    }
    /* `version` no se lee dentro del efecto: solo fuerza que se repita tras `recargar()`. */
  }, [idUsuario, version])

  const recargar = useCallback(() => setVersion((anterior) => anterior + 1), [])

  return { ...estado, recargar }
}
