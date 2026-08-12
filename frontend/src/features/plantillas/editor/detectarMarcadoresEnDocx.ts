import type { MarcadorDeDocx } from '../data'
import { parrafosDeNivelSuperior, textoDeParrafo } from './xmlDeDocx'

/*
  Todo el marcado ocurre en Word, nunca en esta app: se documentan tres
  convenciones de texto, todas con el delimitador `[[` `]]` que ya usa
  `.agent/examples/tem.docx`:
    - `[[descripción]]`                          -> marcador simple
    - `[[SI: descripción]]` ... `[[FIN SI]]`      -> sección condicional
    - `[[REPETIR: descripción]]` ... `[[FIN REPETIR]]` -> sección repetible
  Esta función solo lee — la reescritura hacia comandos reales de
  `docx-templates` vive en `prepararComandos.ts`, que recorre el mismo XML
  con la misma lógica de reconocimiento.
*/

const PATRON_SIMPLE_GLOBAL = /\[\[([^[\]]+)\]\]/g
const PATRON_INICIO_CONDICIONAL = /^\[\[SI:\s*(.+)\]\]$/
const PATRON_FIN_CONDICIONAL = /^\[\[FIN SI\]\]$/
const PATRON_INICIO_REPETIBLE = /^\[\[REPETIR:\s*(.+)\]\]$/
const PATRON_FIN_REPETIBLE = /^\[\[FIN REPETIR\]\]$/

function idAleatorio(prefijo: string): string {
  const uuid = globalThis.crypto?.randomUUID?.()
  if (uuid !== undefined) {
    return `${prefijo}-${uuid}`
  }

  return `${prefijo}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function detectarMarcadoresEnDocx(documentXml: string): readonly MarcadorDeDocx[] {
  const { parrafos } = parrafosDeNivelSuperior(documentXml)
  const marcadores: MarcadorDeDocx[] = []

  let dentroDeCondicional = false
  let dentroDeRepetible = false

  for (const parrafo of parrafos) {
    const texto = textoDeParrafo(parrafo).trim()

    const inicioCondicional = texto.match(PATRON_INICIO_CONDICIONAL)
    if (inicioCondicional !== null && !dentroDeCondicional && !dentroDeRepetible) {
      const descripcion = (inicioCondicional[1] ?? '').trim()
      marcadores.push({
        tipo: 'condicional',
        id: idAleatorio('sec'),
        descripcion,
        origenDeDato: { tipo: 'personalizado', etiqueta: descripcion },
      })
      dentroDeCondicional = true
      continue
    }

    if (dentroDeCondicional && PATRON_FIN_CONDICIONAL.test(texto)) {
      dentroDeCondicional = false
      continue
    }

    const inicioRepetible = texto.match(PATRON_INICIO_REPETIBLE)
    if (inicioRepetible !== null && !dentroDeCondicional && !dentroDeRepetible) {
      const descripcion = (inicioRepetible[1] ?? '').trim()
      marcadores.push({
        tipo: 'repetible',
        id: idAleatorio('sec'),
        descripcion,
        origenDeDato: { tipo: 'personalizado', etiqueta: descripcion },
      })
      dentroDeRepetible = true
      continue
    }

    if (dentroDeRepetible && PATRON_FIN_REPETIBLE.test(texto)) {
      dentroDeRepetible = false
      continue
    }

    /* El contenido interno de una sección repetible se liga al valor de cada iteración, no a un marcador propio. */
    if (dentroDeRepetible) {
      continue
    }

    for (const coincidencia of texto.matchAll(PATRON_SIMPLE_GLOBAL)) {
      const descripcion = (coincidencia[1] ?? '').trim()
      marcadores.push({
        tipo: 'simple',
        id: idAleatorio('mar'),
        textoOriginal: coincidencia[0],
        contexto: texto,
        origenDeDato: { tipo: 'personalizado', etiqueta: descripcion },
        formato: 'parrafo',
      })
    }
  }

  return marcadores
}
