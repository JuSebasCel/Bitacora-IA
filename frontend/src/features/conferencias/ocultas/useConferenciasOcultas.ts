import { useCallback, useState } from 'react'
import { idsOcultosDe, ocultarConferencia } from './almacenamiento'

/*
  Envoltorio fino sobre `almacenamiento.ts`, mismo criterio que `useEtiquetas`:
  el estado se ajusta durante el render cuando cambia `idUsuario`, para que un
  cambio de sesión no deje ver, por un render intermedio, lo que ocultó la
  persona anterior.
*/

export type ValorDeOcultas = {
  readonly idsOcultos: readonly string[]
  readonly ocultar: (idConferencia: string) => void
}

type EstadoDeOcultas = {
  readonly idUsuario: string
  readonly idsOcultos: readonly string[]
}

export function useConferenciasOcultas(idUsuario: string): ValorDeOcultas {
  const [estado, setEstado] = useState<EstadoDeOcultas>(() => ({
    idUsuario,
    idsOcultos: idsOcultosDe(idUsuario),
  }))

  if (estado.idUsuario !== idUsuario) {
    setEstado({ idUsuario, idsOcultos: idsOcultosDe(idUsuario) })
  }

  const idsOcultos = estado.idUsuario === idUsuario ? estado.idsOcultos : idsOcultosDe(idUsuario)

  const ocultar = useCallback(
    (idConferencia: string) => {
      setEstado({ idUsuario, idsOcultos: ocultarConferencia(idUsuario, idConferencia) })
    },
    [idUsuario],
  )

  return { idsOcultos, ocultar }
}
