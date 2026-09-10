import { useCallback, useEffect, useState } from 'react'
import { listarOcultas, mostrarRemota, ocultarRemota } from './repositorio'

/*
  Qué conferencias sacó esta persona de su propio listado (B10).

  Antes en sessionStorage; ahora en la tabla `conferencias_ocultas`. Ocultar y
  mostrar actualizan la lista local de inmediato y escriben en segundo plano:
  es una preferencia de vista, no un dato compartido, y una relectura solo
  serviría para parpadear.

  Al cambiar de sesión la lista se vacía enseguida (no se muestra la de la
  cuenta anterior ni por un render) y se recarga la nueva.
*/

export type ValorDeOcultas = {
  readonly idsOcultos: readonly string[]
  readonly ocultar: (idConferencia: string) => void
  readonly mostrar: (idConferencia: string) => void
}

export function useConferenciasOcultas(idUsuario: string): ValorDeOcultas {
  const [idsOcultos, setIdsOcultos] = useState<readonly string[]>([])

  useEffect(() => {
    let cancelado = false

    if (idUsuario === '') {
      setIdsOcultos([])
      return
    }

    setIdsOcultos([])
    listarOcultas().then((respuesta) => {
      if (!cancelado && respuesta.ok) setIdsOcultos(respuesta.datos)
    })

    return () => {
      cancelado = true
    }
  }, [idUsuario])

  const ocultar = useCallback(
    (idConferencia: string) => {
      setIdsOcultos((previos) =>
        previos.includes(idConferencia) ? previos : [...previos, idConferencia],
      )
      void ocultarRemota(idUsuario, idConferencia)
    },
    [idUsuario],
  )

  const mostrar = useCallback((idConferencia: string) => {
    setIdsOcultos((previos) => previos.filter((id) => id !== idConferencia))
    void mostrarRemota(idConferencia)
  }, [])

  return { idsOcultos, ocultar, mostrar }
}
