import { useCallback, useState } from 'react'
import { eliminarPlantilla, guardarPlantilla, todasLasPlantillas } from './almacenamiento'
import type { CampoDeMarcador, ElementoDePlantilla, FormatoDeMarcador, Plantilla } from './data'
import {
  actualizarElemento as actualizarElementoPuro,
  agregarElementoDeImagen as agregarElementoDeImagenPuro,
  agregarElementoDeMarcador as agregarElementoDeMarcadorPuro,
  agregarElementoDeTexto as agregarElementoDeTextoPuro,
  cambiarColores as cambiarColoresPuro,
  crearPlantillaEnBlanco,
  quitarElemento as quitarElementoPuro,
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
  readonly renombrarPlantilla: (id: string, nombre: string) => ResultadoPlantilla
  readonly cambiarColores: (id: string, colorPrincipal: string, colorSecundario: string) => void
  readonly agregarElementoDeTexto: (id: string) => void
  readonly agregarElementoDeImagen: (id: string, url: string, nombreDeArchivo: string) => void
  readonly agregarElementoDeMarcador: (
    id: string,
    campo?: CampoDeMarcador,
    formato?: FormatoDeMarcador,
  ) => void
  readonly actualizarElemento: (
    id: string,
    idElemento: string,
    cambios: Partial<ElementoDePlantilla>,
  ) => void
  readonly quitarElemento: (id: string, idElemento: string) => void
  readonly eliminar: (id: string) => void
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

  const agregarElementoDeTexto = useCallback(
    (id: string): void => {
      conPlantilla(id, agregarElementoDeTextoPuro)
    },
    [conPlantilla],
  )

  const agregarElementoDeImagen = useCallback(
    (id: string, url: string, nombreDeArchivo: string): void => {
      conPlantilla(id, (plantilla) => agregarElementoDeImagenPuro(plantilla, url, nombreDeArchivo))
    },
    [conPlantilla],
  )

  const agregarElementoDeMarcador = useCallback(
    (id: string, campo?: CampoDeMarcador, formato?: FormatoDeMarcador): void => {
      conPlantilla(id, (plantilla) => agregarElementoDeMarcadorPuro(plantilla, campo, formato))
    },
    [conPlantilla],
  )

  const actualizarElemento = useCallback(
    (id: string, idElemento: string, cambios: Partial<ElementoDePlantilla>): void => {
      conPlantilla(id, (plantilla) => actualizarElementoPuro(plantilla, idElemento, cambios))
    },
    [conPlantilla],
  )

  const quitarElemento = useCallback(
    (id: string, idElemento: string): void => {
      conPlantilla(id, (plantilla) => quitarElementoPuro(plantilla, idElemento))
    },
    [conPlantilla],
  )

  const eliminar = useCallback((id: string): void => {
    eliminarPlantilla(id)
    setPlantillas((anteriores) => anteriores.filter((candidata) => candidata.id !== id))
  }, [])

  return {
    plantillas,
    crear,
    renombrarPlantilla,
    cambiarColores,
    agregarElementoDeTexto,
    agregarElementoDeImagen,
    agregarElementoDeMarcador,
    actualizarElemento,
    quitarElemento,
    eliminar,
  }
}
