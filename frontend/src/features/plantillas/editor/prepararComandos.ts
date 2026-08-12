import type { MarcadorDeDocx } from '../data'
import { resolverCondicionDeMarcador, resolverListaDeMarcador, resolverMarcador } from '../data'
import { parrafosDeNivelSuperior, reemplazarTextoDeParrafo, serializarDocumento, textoDeParrafo } from './xmlDeDocx'

/*
  Traduce las marcas `[[...]]` que el usuario escribió en Word a comandos
  reales de `docx-templates` (`cmdDelimiter: ['[[', ']]']`), usando el mismo
  reconocimiento de párrafos que `detectarMarcadoresEnDocx.ts`. El usuario
  nunca ve ni escribe esta sintaxis — la genera esta función a partir de lo
  que ya mapeó en la pantalla de la plantilla.

  Los marcadores se consumen en el mismo orden en que aparecen en el
  documento (`marcadores` conserva ese orden desde que se detectaron por
  primera vez): así, dos placeholders con el mismo texto literal
  (`[[Nombre]]` repetido, por ejemplo) no se confunden entre sí, porque cada
  ocurrencia recibe su propia variable a partir de su propio `id`, no del
  texto que comparten.
*/

const PATRON_SIMPLE_PRUEBA = /\[\[([^[\]]+)\]\]/
const PATRON_SIMPLE_GLOBAL = /\[\[([^[\]]+)\]\]/g
const PATRON_INICIO_CONDICIONAL = /^\[\[SI:\s*(.+)\]\]$/
const PATRON_FIN_CONDICIONAL = /^\[\[FIN SI\]\]$/
const PATRON_INICIO_REPETIBLE = /^\[\[REPETIR:\s*(.+)\]\]$/
const PATRON_FIN_REPETIBLE = /^\[\[FIN REPETIR\]\]$/

function nombreDeVariable(id: string): string {
  return `m_${id.replace(/[^a-zA-Z0-9_]/g, '_')}`
}

export type ComandosPreparados = {
  readonly documentXml: string
  readonly datos: Record<string, unknown>
}

export function prepararComandos(
  documentXmlOriginal: string,
  marcadores: readonly MarcadorDeDocx[],
): ComandosPreparados {
  const { doc, parrafos } = parrafosDeNivelSuperior(documentXmlOriginal)
  const datos: Record<string, unknown> = {}
  const restantes = [...marcadores]

  let dentroDeCondicional = false
  let variableDelRepetibleActivo: string | null = null

  for (const parrafo of parrafos) {
    const texto = textoDeParrafo(parrafo).trim()

    const inicioCondicional = texto.match(PATRON_INICIO_CONDICIONAL)
    if (inicioCondicional !== null && !dentroDeCondicional && variableDelRepetibleActivo === null) {
      const marcador = restantes.shift()
      if (marcador?.tipo === 'condicional') {
        const variable = nombreDeVariable(marcador.id)
        datos[variable] = resolverCondicionDeMarcador(marcador.origenDeDato)
        reemplazarTextoDeParrafo(doc, parrafo, `[[IF ${variable}]]`)
        dentroDeCondicional = true
      }
      continue
    }

    if (dentroDeCondicional && PATRON_FIN_CONDICIONAL.test(texto)) {
      reemplazarTextoDeParrafo(doc, parrafo, '[[END-IF]]')
      dentroDeCondicional = false
      continue
    }

    const inicioRepetible = texto.match(PATRON_INICIO_REPETIBLE)
    if (inicioRepetible !== null && !dentroDeCondicional && variableDelRepetibleActivo === null) {
      const marcador = restantes.shift()
      if (marcador?.tipo === 'repetible') {
        const variable = nombreDeVariable(marcador.id)
        datos[variable] = resolverListaDeMarcador(marcador.origenDeDato)
        reemplazarTextoDeParrafo(doc, parrafo, `[[FOR item_${variable} IN ${variable}]]`)
        variableDelRepetibleActivo = variable
      }
      continue
    }

    if (variableDelRepetibleActivo !== null && PATRON_FIN_REPETIBLE.test(texto)) {
      reemplazarTextoDeParrafo(doc, parrafo, `[[END-FOR item_${variableDelRepetibleActivo}]]`)
      variableDelRepetibleActivo = null
      continue
    }

    /* Dentro de una sección repetible, cualquier marcador propio referencia el valor de la iteración actual. */
    if (variableDelRepetibleActivo !== null) {
      if (PATRON_SIMPLE_PRUEBA.test(texto)) {
        const nuevoTexto = texto.replace(PATRON_SIMPLE_GLOBAL, `[[$item_${variableDelRepetibleActivo}]]`)
        reemplazarTextoDeParrafo(doc, parrafo, nuevoTexto)
      }
      continue
    }

    if (PATRON_SIMPLE_PRUEBA.test(texto)) {
      const nuevoTexto = texto.replace(PATRON_SIMPLE_GLOBAL, () => {
        const marcador = restantes.shift()
        if (marcador?.tipo !== 'simple') {
          return ''
        }

        const variable = nombreDeVariable(marcador.id)
        datos[variable] = resolverMarcador(marcador.origenDeDato, marcador.formato)
        return `[[${variable}]]`
      })

      reemplazarTextoDeParrafo(doc, parrafo, nuevoTexto)
    }
  }

  return { documentXml: serializarDocumento(doc), datos }
}
