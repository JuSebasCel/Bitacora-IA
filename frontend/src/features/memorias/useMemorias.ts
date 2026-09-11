import { useCallback, useEffect, useState } from 'react'
import type { CodigoError } from '@/shared/errors'
import type { Memoria } from './data'
import { crearMemoria as crearMemoriaPura } from './memorias'
import type { ResultadoMemoria } from './memorias'
import { crearMemoria, eliminarMemoria, listarMemorias } from './repositorio'

/*
  Estado de las memorias del grupo contra Supabase (B6). Mismo reparto que
  `usePlantillas`: las reglas siguen en `memorias.ts` (qué nombre es válido,
  qué campos son obligatorios) y aquí solo vive el estado y la llamada al
  repositorio. Sin `renombrar`/`actualizar`: una memoria no se edita después
  de generarse.

  `cargando` y `codigoDeError` explícitos por lo mismo que en plantillas: la
  lectura es de red, y sin ellos el listado diría "todavía no hay memorias"
  mientras la promesa no resuelve, y no diría nada cuando la lectura falla.

  A diferencia de plantillas, aquí no hay escritura optimista ni guardado
  diferido: generar una memoria es un acto puntual y explícito, no
  autoguardado, así que se espera la confirmación de la base antes de mostrarla
  en el listado. Una memoria que aparece y desaparece porque el insert falló
  sería peor que medio segundo de espera con el panel todavía abierto.
*/

export type ValorDeMemorias = {
  readonly memorias: readonly Memoria[]
  readonly cargando: boolean
  /** Fallo al leer el listado. El fallo al generar viaja en el resultado de `generar`. */
  readonly codigoDeError: CodigoError | null
  readonly generar: (idConferencia: string, idPlantilla: string, nombre: string) => Promise<ResultadoMemoria>
  readonly eliminar: (id: string) => Promise<void>
}

export function useMemorias(idUsuario: string): ValorDeMemorias {
  const [memorias, setMemorias] = useState<readonly Memoria[]>([])
  const [cargando, setCargando] = useState(true)
  const [codigoDeError, setCodigoDeError] = useState<CodigoError | null>(null)

  useEffect(() => {
    let cancelado = false

    if (idUsuario === '') {
      setMemorias([])
      setCargando(false)
      return
    }

    setCargando(true)

    listarMemorias().then((resultado) => {
      if (cancelado) {
        return
      }

      if (resultado.ok) {
        setMemorias(resultado.datos)
        setCodigoDeError(null)
      } else {
        setCodigoDeError(resultado.codigo)
      }

      setCargando(false)
    })

    return () => {
      cancelado = true
    }
  }, [idUsuario])

  const generar = useCallback(
    async (idConferencia: string, idPlantilla: string, nombre: string): Promise<ResultadoMemoria> => {
      const resultado = crearMemoriaPura(idConferencia, idPlantilla, nombre, idUsuario)

      if (!resultado.ok) {
        return resultado
      }

      const guardada = await crearMemoria(resultado.memoria)

      if (!guardada.ok) {
        return { ok: false, codigo: guardada.codigo }
      }

      /* Al principio, no al final: el listado va de la más reciente a la más antigua. */
      setMemorias((anteriores) => [resultado.memoria, ...anteriores])

      return resultado
    },
    [idUsuario],
  )

  const eliminar = useCallback(async (id: string): Promise<void> => {
    setMemorias((anteriores) => anteriores.filter((candidata) => candidata.id !== id))
    await eliminarMemoria(id)
  }, [])

  return { memorias, cargando, codigoDeError, generar, eliminar }
}
