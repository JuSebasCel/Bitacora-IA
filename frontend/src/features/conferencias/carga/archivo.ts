import type { FuenteDeConferencia } from '../data'
import { EXTENSIONES_POR_FUENTE } from './validacion'

/*
  Lo que el propio archivo ya dice de sí mismo.

  El formulario de carga pedía a mano la fuente —audio o transcripción— y eso
  era pedir dos veces lo mismo: la extensión ya lo decide, y peor aún, las dos
  respuestas podían contradecirse (elegir "audio", subir un .docx y enterarse
  al enviar). Aquí se deduce del archivo y deja de ser una pregunta.

  Lo mismo con la duración: un archivo de audio la trae, y el navegador sabe
  leerla sin ayuda de nadie. Antes la conferencia nacía con `0` y había que
  esperar al análisis para saber cuánto duraba la charla que acabas de subir.

  Lo que NO se deduce aquí es lo que solo sabe la IA leyendo el contenido: el
  tema principal, el resumen y las fichas. Esto es metadatos del fichero, no
  comprensión de lo que dice.
*/

/** `null` si la extensión no es de ninguna de las dos familias admitidas. */
export function fuenteDeArchivo(archivo: File): FuenteDeConferencia | null {
  const nombre = archivo.name.toLowerCase()

  for (const [fuente, extensiones] of Object.entries(EXTENSIONES_POR_FUENTE)) {
    if (extensiones.some((extension) => nombre.endsWith(extension))) {
      return fuente as FuenteDeConferencia
    }
  }

  return null
}

/*
  El nombre del fichero como primer título, que es casi siempre mejor que el
  campo en blanco: quien exporta una grabación suele nombrarla por la charla.
  Se le quita la extensión, se cambian guiones y bajos por espacios y se
  colapsa el espacio sobrante. Es una sugerencia y se puede escribir encima.
*/
export function tituloSugerido(archivo: File): string {
  return archivo.name
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/*
  Duración en segundos leída del propio archivo. Solo tiene sentido en audio:
  una transcripción no dura nada, y devolver 0 es lo correcto y no un fallo.

  Un archivo que el navegador no sepa decodificar tampoco es un error de
  carga: se resuelve en 0 y el análisis la rellenará cuando lo procese. Por
  eso esto nunca rechaza.
*/
export function duracionDeArchivo(archivo: File): Promise<number> {
  if (fuenteDeArchivo(archivo) !== 'audio') {
    return Promise.resolve(0)
  }

  return new Promise((resolver) => {
    const url = URL.createObjectURL(archivo)
    const audio = new Audio()

    function terminar(segundos: number): void {
      URL.revokeObjectURL(url)
      resolver(Number.isFinite(segundos) && segundos > 0 ? Math.round(segundos) : 0)
    }

    audio.addEventListener('loadedmetadata', () => terminar(audio.duration), { once: true })
    audio.addEventListener('error', () => terminar(0), { once: true })
    audio.preload = 'metadata'
    audio.src = url
  })
}
