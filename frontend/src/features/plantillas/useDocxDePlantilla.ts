import { useEffect, useState } from 'react'
import type { CodigoError } from '@/shared/errors'
import { descargarDocxDePlantilla } from './repositorio'

/*
  Los bytes del `.docx` original de una plantilla importada, traídos del bucket
  cuando de verdad hacen falta.

  Antes de B6 el archivo entero venía dentro del propio registro de la
  plantilla (data URL en `sessionStorage`), así que cualquier componente que lo
  necesitara solo hacía `fetch(plantilla.archivoOriginal)`. Ahora es una
  descarga de red, y son varios los lugares que la piden con el mismo patrón
  (miniatura de la tarjeta, confirmación de la plantilla, generación de una
  memoria): este hook es ese patrón una sola vez, para que ninguno de ellos
  llame al repositorio por su cuenta ni repita el manejo de cancelación.

  Se descarga por plantilla y no se cachea entre montajes a propósito: el
  navegador ya cachea la respuesta HTTP, y sostener aquí un mapa de blobs
  volvería a poner en memoria justo lo que B6 sacó de `sessionStorage`.
*/

export type ValorDeDocxDePlantilla = {
  readonly archivo: Blob | null
  readonly cargando: boolean
  readonly codigoDeError: CodigoError | null
}

export function useDocxDePlantilla(ruta: string | null): ValorDeDocxDePlantilla {
  const [archivo, setArchivo] = useState<Blob | null>(null)
  const [cargando, setCargando] = useState(ruta !== null)
  const [codigoDeError, setCodigoDeError] = useState<CodigoError | null>(null)

  useEffect(() => {
    if (ruta === null) {
      setArchivo(null)
      setCargando(false)
      setCodigoDeError(null)
      return
    }

    let cancelado = false
    setCargando(true)
    setCodigoDeError(null)

    descargarDocxDePlantilla(ruta).then((resultado) => {
      if (cancelado) {
        return
      }

      setArchivo(resultado.ok ? resultado.datos : null)
      setCodigoDeError(resultado.ok ? null : resultado.codigo)
      setCargando(false)
    })

    return () => {
      cancelado = true
    }
  }, [ruta])

  return { archivo, cargando, codigoDeError }
}
