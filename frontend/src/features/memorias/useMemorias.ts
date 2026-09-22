import { useCallback, useEffect, useState } from 'react'
import { hayBackend } from '@/shared/api/backend'
import type { CodigoError } from '@/shared/errors'
import type { Memoria } from './data'
import { crearMemoria as crearMemoriaPura } from './memorias'
import type { ResultadoMemoria } from './memorias'
import { memoriasRecordadas, recordarMemorias } from './memoriasRecordadas'
import { crearMemoria, eliminarMemoria, listarMemorias } from './repositorio'
import { redactarSecciones } from './redaccion'
import { preferenciasActuales } from '@/features/configuracion/preferencias'
import { avisarTermino } from '@/shared/avisos/avisoDeTermino'
import type { HuecoParaRedactar, SeccionesRedactadas } from './redaccion'

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
  readonly generar: (
    idConferencia: string,
    idPlantilla: string,
    nombre: string,
    huecos?: readonly HuecoParaRedactar[],
  ) => Promise<ResultadoMemoria>
  readonly eliminar: (id: string) => Promise<void>
}

export function useMemorias(idUsuario: string): ValorDeMemorias {
  /* Con algo recordado no hay nada que esperar: se enseña y se relee detrás (ver `memoriasRecordadas.ts`). */
  const [memorias, setMemorias] = useState<readonly Memoria[]>(() => memoriasRecordadas(idUsuario) ?? [])
  const [cargando, setCargando] = useState(() => memoriasRecordadas(idUsuario) === null)
  const [codigoDeError, setCodigoDeError] = useState<CodigoError | null>(null)

  useEffect(() => {
    let cancelado = false

    if (idUsuario === '') {
      setMemorias([])
      setCargando(false)
      return
    }

    setCargando(memoriasRecordadas(idUsuario) === null)

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

  /* Lo que se ve es lo que se recuerda, también tras generar o borrar una. */
  useEffect(() => {
    if (!cargando && idUsuario !== '') {
      recordarMemorias(idUsuario, memorias)
    }
  }, [memorias, cargando, idUsuario])

  const generar = useCallback(
    async (
      idConferencia: string,
      idPlantilla: string,
      nombre: string,
      huecos: readonly HuecoParaRedactar[] = [],
      tono = '',
    ): Promise<ResultadoMemoria> => {
      /*
        Se valida ANTES de redactar: un nombre vacío o una conferencia sin
        elegir se sabe sin llamar a nadie, y descubrirlo después de pagar la
        llamada al modelo sería cobrar por un error que se veía en el
        formulario.
      */
      const validada = crearMemoriaPura(idConferencia, idPlantilla, nombre, idUsuario)

      if (!validada.ok) {
        return validada
      }

      /*
        Sin backend (desarrollo sin `VITE_API_URL`) o sin huecos no hay nada
        que redactar, y la memoria sale como antes: con los datos que se
        podían copiar de la conferencia. Con backend, un fallo al redactar
        —sin API key, sin saldo— detiene la generación: guardar una memoria
        sin su contenido y enterarse al abrirla sería peor que no guardarla.
      */
      let secciones: SeccionesRedactadas | undefined

      if (huecos.length > 0 && hayBackend()) {
        const redactadas = await redactarSecciones(idConferencia, huecos, tono)

        if (!redactadas.ok) {
          return { ok: false, codigo: redactadas.codigo }
        }

        secciones = redactadas.datos
      }

      const resultado = crearMemoriaPura(idConferencia, idPlantilla, nombre, idUsuario, secciones)

      if (!resultado.ok) {
        return resultado
      }

      const guardada = await crearMemoria(resultado.memoria)

      if (!guardada.ok) {
        return { ok: false, codigo: guardada.codigo }
      }

      /* Al principio, no al final: el listado va de la más reciente a la más antigua. */
      setMemorias((anteriores) => [resultado.memoria, ...anteriores])

      if (secciones !== undefined && preferenciasActuales().avisarAlTerminar) {
        avisarTermino('Memoria lista')
      }

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
