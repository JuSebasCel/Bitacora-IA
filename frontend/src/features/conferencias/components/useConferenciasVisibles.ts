import { useCallback, useEffect, useState } from 'react'
import { conferenciasCargadasDe } from '../carga'
import { CONFERENCIAS_DE_EJEMPLO } from '../data'
import { conferenciasVisibles } from '../query'
import type { ConferenciaVisible } from '../query'

/*
  Lo que una persona puede ver, con su estado de carga.

  Hoy los datos llegan de un fixture y podrían resolverse en el mismo render,
  pero el hook expone igualmente un estado de carga: cuando B6 sustituya el
  fixture por una consulta real, la pantalla no tendrá que cambiar y el
  esqueleto ya estará probado. Un estado de carga añadido después obliga a
  revisar todos los casos que asumían datos inmediatos.

  Se fusiona con lo que esa persona cargó en esta sesión (F3): `recargar`
  existe para que, tras guardar una conferencia nueva, quien la cargó vea el
  listado actualizado sin tener que recargar la página.
*/

export type EstadoDeCarga = 'cargando' | 'listo'

export type ConferenciasVisibles = {
  readonly carga: EstadoDeCarga
  readonly visibles: readonly ConferenciaVisible[]
  readonly recargar: () => void
}

export function useConferenciasVisibles(idUsuario: string): ConferenciasVisibles {
  const [estado, setEstado] = useState<{ carga: EstadoDeCarga; visibles: readonly ConferenciaVisible[] }>(
    { carga: 'cargando', visibles: [] },
  )
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const todas = [...CONFERENCIAS_DE_EJEMPLO, ...conferenciasCargadasDe(idUsuario)]

    setEstado({
      carga: 'listo',
      visibles: conferenciasVisibles(todas, idUsuario),
    })
    /* `version` no se lee dentro del efecto: solo fuerza que se repita tras `recargar()`. */
  }, [idUsuario, version])

  const recargar = useCallback(() => setVersion((anterior) => anterior + 1), [])

  return { ...estado, recargar }
}
