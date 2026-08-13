import { useCallback, useState } from 'react'
import { eliminarMemoria, guardarMemoria, todasLasMemorias } from './almacenamiento'
import type { Memoria } from './data'
import { crearMemoria } from './memorias'
import type { ResultadoMemoria } from './memorias'

/*
  Envoltorio fino sobre `memorias.ts` y `almacenamiento.ts`, mismo criterio
  que `usePlantillas.ts`: cada mutador aplica la función pura correspondiente
  y persiste el resultado. Sin `renombrar`/`actualizar` — una memoria no se
  edita después de generarse.
*/

export type ValorDeMemorias = {
  readonly memorias: readonly Memoria[]
  readonly generar: (idConferencia: string, idPlantilla: string, nombre: string) => ResultadoMemoria
  readonly eliminar: (id: string) => void
}

export function useMemorias(): ValorDeMemorias {
  const [memorias, setMemorias] = useState<readonly Memoria[]>(() => todasLasMemorias())

  const generar = useCallback(
    (idConferencia: string, idPlantilla: string, nombre: string): ResultadoMemoria => {
      const resultado = crearMemoria(idConferencia, idPlantilla, nombre)

      if (resultado.ok) {
        guardarMemoria(resultado.memoria)
        setMemorias((anteriores) => [...anteriores, resultado.memoria])
      }

      return resultado
    },
    [],
  )

  const eliminar = useCallback((id: string): void => {
    eliminarMemoria(id)
    setMemorias((anteriores) => anteriores.filter((candidata) => candidata.id !== id))
  }, [])

  return { memorias, generar, eliminar }
}
