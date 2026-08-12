import { useCallback, useState } from 'react'
import { eliminarPlantilla, guardarPlantilla, todasLasPlantillas } from './almacenamiento'
import type { JSONContent, MarcadorDeDocx, Plantilla } from './data'
import {
  actualizarContenido as actualizarContenidoPuro,
  actualizarMarcadoresDeDocx as actualizarMarcadoresDeDocxPuro,
  cambiarColores as cambiarColoresPuro,
  crearPlantillaDesdeDocx,
  crearPlantillaEnBlanco,
  esPlantillaEnBlancoAbandonada,
  renombrarPlantilla as renombrarPlantillaPura,
} from './plantillas'
import type { ResultadoPlantilla } from './plantillas'

/*
  Envoltorio fino sobre `plantillas.ts` y `almacenamiento.ts`, mismo criterio
  que `useDirectorio`: cada mutador aplica la función pura correspondiente
  sobre la plantilla actual, la persiste, y actualiza el estado en memoria.
  Sin `idUsuario`: las plantillas son del grupo, no de una persona.
*/

export type ValorDePlantillas = {
  readonly plantillas: readonly Plantilla[]
  readonly crear: () => Plantilla
  readonly crearDesdeDocx: (
    archivoOriginal: string,
    nombre: string,
    marcadores: readonly MarcadorDeDocx[],
  ) => Plantilla
  readonly renombrarPlantilla: (id: string, nombre: string) => ResultadoPlantilla
  readonly cambiarColores: (id: string, colorPrincipal: string, colorSecundario: string) => void
  readonly actualizarContenido: (id: string, contenido: JSONContent) => void
  readonly actualizarMarcadoresDeDocx: (id: string, marcadores: readonly MarcadorDeDocx[]) => void
  readonly eliminar: (id: string) => void
  readonly podarAbandonadas: () => void
}

export function usePlantillas(): ValorDePlantillas {
  const [plantillas, setPlantillas] = useState<readonly Plantilla[]>(() => todasLasPlantillas())

  const guardarEnEstado = useCallback((actualizada: Plantilla): void => {
    guardarPlantilla(actualizada)
    setPlantillas((anteriores) =>
      anteriores.some((candidata) => candidata.id === actualizada.id)
        ? anteriores.map((candidata) => (candidata.id === actualizada.id ? actualizada : candidata))
        : [...anteriores, actualizada],
    )
  }, [])

  const conPlantilla = useCallback(
    (id: string, transformar: (plantilla: Plantilla) => Plantilla): void => {
      const actual = plantillas.find((candidata) => candidata.id === id)
      if (actual === undefined) {
        return
      }

      guardarEnEstado(transformar(actual))
    },
    [plantillas, guardarEnEstado],
  )

  const crear = useCallback((): Plantilla => {
    const nueva = crearPlantillaEnBlanco()
    guardarEnEstado(nueva)
    return nueva
  }, [guardarEnEstado])

  const crearDesdeDocx = useCallback(
    (archivoOriginal: string, nombre: string, marcadores: readonly MarcadorDeDocx[]): Plantilla => {
      const nueva = crearPlantillaDesdeDocx(archivoOriginal, nombre, marcadores)
      guardarEnEstado(nueva)
      return nueva
    },
    [guardarEnEstado],
  )

  const renombrarPlantilla = useCallback(
    (id: string, nombre: string): ResultadoPlantilla => {
      const actual = plantillas.find((candidata) => candidata.id === id)
      if (actual === undefined) {
        return { ok: false, codigo: 'PLANT_NO_ENCONTRADA' }
      }

      const resultado = renombrarPlantillaPura(actual, nombre)
      if (resultado.ok) {
        guardarEnEstado(resultado.plantilla)
      }

      return resultado
    },
    [plantillas, guardarEnEstado],
  )

  const cambiarColores = useCallback(
    (id: string, colorPrincipal: string, colorSecundario: string): void => {
      conPlantilla(id, (plantilla) => cambiarColoresPuro(plantilla, colorPrincipal, colorSecundario))
    },
    [conPlantilla],
  )

  const actualizarContenido = useCallback(
    (id: string, contenido: JSONContent): void => {
      conPlantilla(id, (plantilla) => actualizarContenidoPuro(plantilla, contenido))
    },
    [conPlantilla],
  )

  const actualizarMarcadoresDeDocx = useCallback(
    (id: string, marcadores: readonly MarcadorDeDocx[]): void => {
      conPlantilla(id, (plantilla) => actualizarMarcadoresDeDocxPuro(plantilla, marcadores))
    },
    [conPlantilla],
  )

  const eliminar = useCallback((id: string): void => {
    eliminarPlantilla(id)
    setPlantillas((anteriores) => anteriores.filter((candidata) => candidata.id !== id))
  }, [])

  /*
    Red de seguridad para plantillas en blanco abandonadas: "Crear plantilla"
    persiste de inmediato, así que salir sin tocar nada (sin darle nombre ni
    contenido) dejaría una entrada vacía acumulándose. El punto principal de
    limpieza es el botón "Volver a plantillas" del propio editor (borra ahí
    mismo, sin esperar a este barrido); esto cubre cualquier otra forma de
    salir (navegación lateral, atrás del navegador). Se llama al montar el
    listado — leer el propio arreglo en memoria y filtrar es idempotente, así
    que no hay problema si React (`StrictMode`) lo invoca dos veces seguidas.
  */
  const podarAbandonadas = useCallback((): void => {
    setPlantillas((anteriores) => {
      const abandonadas = anteriores.filter(esPlantillaEnBlancoAbandonada)
      if (abandonadas.length === 0) {
        return anteriores
      }

      for (const plantilla of abandonadas) {
        eliminarPlantilla(plantilla.id)
      }

      return anteriores.filter((candidata) => !esPlantillaEnBlancoAbandonada(candidata))
    })
  }, [])

  return {
    plantillas,
    crear,
    crearDesdeDocx,
    renombrarPlantilla,
    cambiarColores,
    actualizarContenido,
    actualizarMarcadoresDeDocx,
    eliminar,
    podarAbandonadas,
  }
}
