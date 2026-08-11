import { useEffect, useState } from 'react'
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
*/

export type EstadoDeCarga = 'cargando' | 'listo'

export type ConferenciasVisibles = {
  readonly carga: EstadoDeCarga
  readonly visibles: readonly ConferenciaVisible[]
}

export function useConferenciasVisibles(idUsuario: string): ConferenciasVisibles {
  const [estado, setEstado] = useState<ConferenciasVisibles>({ carga: 'cargando', visibles: [] })

  useEffect(() => {
    setEstado({
      carga: 'listo',
      visibles: conferenciasVisibles(CONFERENCIAS_DE_EJEMPLO, idUsuario),
    })
  }, [idUsuario])

  return estado
}
