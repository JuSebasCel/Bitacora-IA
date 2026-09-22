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
  Ritmo de habla con que se estima cuánto dura una transcripción. Es el mismo
  que usa el backend (`PALABRAS_POR_MINUTO` en `transcripcion/segmentos.py`)
  para un texto sin marcas de tiempo: si los dos lados estimaran distinto, el
  tope de fichas que se ofrece aquí no sería el que el análisis aplica.
*/
const PALABRAS_POR_MINUTO = 150

/*
  Duración en segundos del archivo. En un audio se lee de sus metadatos; en
  una transcripción se estima por el número de palabras.

  Antes una transcripción devolvía 0, y eso tenía un costo que no se veía: el
  tope de fichas se calcula con la duración, y con 0 minutos salía el mínimo,
  tres fichas, para una charla de quince minutos. Una estimación por palabras
  no es exacta, pero está en el orden de magnitud correcto, que es lo único
  que el tope necesita.

  Un archivo que no se pueda leer no es un error de carga: se resuelve en 0 y
  el análisis la rellenará cuando lo procese. Por eso esto nunca rechaza.
*/
export async function duracionDeArchivo(archivo: File): Promise<number> {
  if (fuenteDeArchivo(archivo) !== 'audio') {
    try {
      const palabras = contarPalabras(await textoDeTranscripcion(archivo))
      return Math.round((palabras / PALABRAS_POR_MINUTO) * 60)
    } catch {
      return 0
    }
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

function contarPalabras(texto: string): number {
  return texto.split(/\s+/).filter((palabra) => palabra !== '').length
}

/*
  El texto de una transcripción, solo para contar palabras. Un `.docx` es un
  zip con el cuerpo en `word/document.xml`; basta con quitarle las etiquetas.
  Un `.pdf` no se sabe leer aquí (tampoco en el backend), y cuenta como vacío.
*/
async function textoDeTranscripcion(archivo: File): Promise<string> {
  const nombre = archivo.name.toLowerCase()

  if (nombre.endsWith('.docx')) {
    const { default: JSZip } = await import('jszip')
    const zip = await JSZip.loadAsync(await archivo.arrayBuffer())
    const xml = (await zip.file('word/document.xml')?.async('string')) ?? ''
    return xml.replace(/<\/w:p>/g, ' ').replace(/<[^>]+>/g, '')
  }

  if (nombre.endsWith('.pdf')) {
    return ''
  }

  return archivo.text()
}
