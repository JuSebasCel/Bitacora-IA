import { useCallback, useEffect, useRef, useState } from 'react'
import type { CodigoError } from '@/shared/errors'
import type { MarcadorDeDocx, Plantilla } from './data'
import {
  actualizarMarcadoresDeDocx as actualizarMarcadoresDeDocxPuro,
  crearPlantillaDesdeDocx,
  idNuevo,
  renombrarPlantilla as renombrarPlantillaPura,
} from './plantillas'
import type { ResultadoPlantilla } from './plantillas'
import {
  actualizarPlantilla,
  crearPlantilla,
  eliminarDocxDePlantilla,
  eliminarPlantilla,
  listarPlantillas,
  subirDocxDePlantilla,
} from './repositorio'
import { listaRecordada, recordarLista } from './listaRecordada'

/*
  Estado de las plantillas del grupo contra Supabase (B6). Sigue apoyándose en
  las funciones puras de `plantillas.ts` para decidir *qué* queda guardado, y
  solo cambia *dónde*: antes `almacenamiento.ts` sobre `sessionStorage`, ahora
  `repositorio.ts`. Sin `idUsuario`: las plantillas son del grupo entero.

  Estado `cargando` explícito, mismo motivo que `useApiKey` en B2 y que
  `SessionProvider` en B1: la lectura pasó a ser de red, y sin este estado el
  listado parpadearía "todavía no hay plantillas" en cada visita mientras la
  promesa no resuelve. `codigoDeError` es el otro lado de lo mismo: una lectura
  puede fallar, y quedarse en cero filas sin decir por qué es indistinguible de
  no tener ninguna.

  Las escrituras son optimistas: el estado en memoria se actualiza primero y la
  llamada al repositorio va detrás. La configuración de una plantilla guarda en
  cada tecla, así que esperar la respuesta antes de pintar convertiría escribir
  una instrucción en una sucesión de saltos de un texto que se adelanta y se
  atrasa.
*/

/**
 * Cuánto se espera, sin más cambios, antes de mandar una edición a Supabase.
 *
 * La configuración persiste en cada tecla: del nombre y de la instrucción de
 * cada campo. Contra `sessionStorage` eso era gratis; contra la red serían decenas
 * de `UPDATE` por párrafo escrito. Se acumulan los cambios y se manda el
 * último estado de cada plantilla tocada. Medio segundo es lo bastante corto
 * para que un cierre de pestaña normal (que además dispara el guardado
 * pendiente al desmontar) no pierda nada perceptible, y lo bastante largo para
 * colapsar una ráfaga de escritura entera en una sola escritura.
 */
export const ESPERA_DE_GUARDADO_MS = 500

export type ValorDePlantillas = {
  readonly plantillas: readonly Plantilla[]
  readonly cargando: boolean
  /** Fallo al leer el listado. Los fallos de escritura viajan en el resultado de cada mutador. */
  readonly codigoDeError: CodigoError | null
  readonly crearDesdeDocx: (
    archivo: File,
    nombre: string,
    marcadores: readonly MarcadorDeDocx[],
  ) => Promise<ResultadoPlantilla>
  readonly renombrarPlantilla: (id: string, nombre: string) => ResultadoPlantilla
  readonly actualizarMarcadoresDeDocx: (id: string, marcadores: readonly MarcadorDeDocx[]) => void
  readonly eliminar: (id: string) => Promise<void>
}

export function usePlantillas(): ValorDePlantillas {
  const [plantillas, setPlantillas] = useState<readonly Plantilla[]>(() => listaRecordada() ?? [])
  /* Con algo recordado no hay nada que esperar: se enseña y se relee detrás. */
  const [cargando, setCargando] = useState(listaRecordada() === null)
  const [codigoDeError, setCodigoDeError] = useState<CodigoError | null>(null)

  /*
    Cambios que todavía no se mandaron, por id. Un `ref` y no estado: cambiarlo
    no debe repintar nada, y el temporizador tiene que ver siempre el último
    valor sin que su `setTimeout` quede capturando una versión vieja.
  */
  const pendientes = useRef(new Map<string, Plantilla>())
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null)

  const vaciarPendientes = useCallback((): void => {
    const porGuardar = [...pendientes.current.values()]
    pendientes.current.clear()

    for (const plantilla of porGuardar) {
      void actualizarPlantilla(plantilla)
    }
  }, [])

  useEffect(() => {
    let cancelado = false

    listarPlantillas().then((resultado) => {
      if (cancelado) {
        return
      }

      if (!resultado.ok) {
        setCodigoDeError(resultado.codigo)
        setCargando(false)
        return
      }

      setCodigoDeError(null)
      setPlantillas(resultado.datos)
      setCargando(false)
    })

    return () => {
      cancelado = true
    }
  }, [])

  /* Lo que se ve es lo que se recuerda, también tras cada escritura optimista. */
  useEffect(() => {
    if (!cargando) {
      recordarLista(plantillas)
    }
  }, [plantillas, cargando])

  /*
    Al desmontar se manda de inmediato lo que quedara pendiente, sin esperar al
    temporizador: salir del editor es justo el momento en que una edición a
    medio guardar se perdería, y es también el más probable (se escribe y se
    vuelve al listado en el mismo segundo).
  */
  useEffect(
    () => () => {
      if (temporizador.current !== null) {
        clearTimeout(temporizador.current)
      }
      vaciarPendientes()
    },
    [vaciarPendientes],
  )

  const reemplazarEnEstado = useCallback((actualizada: Plantilla): void => {
    setPlantillas((anteriores) =>
      anteriores.some((candidata) => candidata.id === actualizada.id)
        ? anteriores.map((candidata) => (candidata.id === actualizada.id ? actualizada : candidata))
        : [...anteriores, actualizada],
    )
  }, [])

  const programarGuardado = useCallback(
    (actualizada: Plantilla): void => {
      reemplazarEnEstado(actualizada)
      pendientes.current.set(actualizada.id, actualizada)

      if (temporizador.current !== null) {
        clearTimeout(temporizador.current)
      }

      temporizador.current = setTimeout(() => {
        temporizador.current = null
        vaciarPendientes()
      }, ESPERA_DE_GUARDADO_MS)
    },
    [reemplazarEnEstado, vaciarPendientes],
  )

  const conPlantilla = useCallback(
    (id: string, transformar: (plantilla: Plantilla) => Plantilla): void => {
      const actual = plantillas.find((candidata) => candidata.id === id)
      if (actual === undefined) {
        return
      }

      programarGuardado(transformar(actual))
    },
    [plantillas, programarGuardado],
  )

  /*
    Crear una plantilla importada son dos escrituras en almacenamientos
    distintos (el `.docx` al bucket, la fila a Postgres) que no comparten
    transacción. Se sube primero porque la fila necesita la ruta: es `not null`
    y el `check` de la tabla la exige para `origen = 'docx'`. Si la fila falla
    después, se borra el archivo recién subido -- dejarlo convertiría cada
    intento fallido en basura permanente en el bucket que nadie sabría
    reclamar, porque ninguna fila la nombra.
  */
  const crearDesdeDocx = useCallback(
    async (
      archivo: File,
      nombre: string,
      marcadores: readonly MarcadorDeDocx[],
    ): Promise<ResultadoPlantilla> => {
      const id = idNuevo()
      const subida = await subirDocxDePlantilla(id, archivo)

      if (!subida.ok) {
        return { ok: false, codigo: subida.codigo }
      }

      const nueva = crearPlantillaDesdeDocx(id, subida.datos, nombre, marcadores)
      const resultado = await crearPlantilla(nueva)

      if (!resultado.ok) {
        void eliminarDocxDePlantilla(subida.datos)
        return resultado
      }

      reemplazarEnEstado(nueva)
      return { ok: true, plantilla: nueva }
    },
    [reemplazarEnEstado],
  )

  /*
    Renombrar sigue siendo síncrono hacia afuera aunque la escritura no lo sea:
    valida con la función pura y devuelve el veredicto en el acto, que es lo
    que el campo de nombre necesita para mostrar el error mientras se escribe.
    Lo que viaja diferido es el guardado, no la validación.
  */
  const renombrarPlantilla = useCallback(
    (id: string, nombre: string): ResultadoPlantilla => {
      const actual = plantillas.find((candidata) => candidata.id === id)
      if (actual === undefined) {
        return { ok: false, codigo: 'PLANT_NO_ENCONTRADA' }
      }

      const resultado = renombrarPlantillaPura(actual, nombre)
      if (resultado.ok) {
        programarGuardado(resultado.plantilla)
      }

      return resultado
    },
    [plantillas, programarGuardado],
  )

  const actualizarMarcadoresDeDocx = useCallback(
    (id: string, marcadores: readonly MarcadorDeDocx[]): void => {
      conPlantilla(id, (plantilla) => actualizarMarcadoresDeDocxPuro(plantilla, marcadores))
    },
    [conPlantilla],
  )

  /*
    Se borra la fila antes que el archivo. Al revés, un fallo en el borrado de
    la fila dejaría una plantilla en el listado apuntando a un `.docx` que ya
    no existe: se vería, se abriría, y fallaría al generar. Un archivo huérfano
    en el bucket, en cambio, no lo ve nadie.
  */
  const eliminar = useCallback(
    async (id: string): Promise<void> => {
      const plantilla = plantillas.find((candidata) => candidata.id === id)

      /* Un cambio todavía sin mandar sobre algo que se está borrando solo lo resucitaría. */
      pendientes.current.delete(id)
      setPlantillas((anteriores) => anteriores.filter((candidata) => candidata.id !== id))

      const resultado = await eliminarPlantilla(id)

      if (resultado.ok && plantilla !== undefined) {
        void eliminarDocxDePlantilla(plantilla.rutaArchivoOriginal)
      }
    },
    [plantillas],
  )

  return {
    plantillas,
    cargando,
    codigoDeError,
    crearDesdeDocx,
    renombrarPlantilla,
    actualizarMarcadoresDeDocx,
    eliminar,
  }
}
