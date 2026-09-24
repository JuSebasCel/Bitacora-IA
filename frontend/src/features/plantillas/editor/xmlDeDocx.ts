/*
  Utilidades compartidas de lectura/escritura sobre `word/document.xml`, el
  cuerpo real de un `.docx`. Las usan tanto `detectarMarcadoresEnDocx.ts`
  (solo lectura) como `prepararComandos.ts` (lectura + reescritura de texto
  de control, nunca del resto del documento).
*/

export const NS_W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'

export type ParrafosDeCuerpo = {
  readonly doc: Document
  readonly parrafos: readonly Element[]
}

/*
  Todos los párrafos del cuerpo, en el orden del documento, incluidos los de
  dentro de una tabla.

  Antes solo se miraban los hijos directos de `<w:body>`, y eso dejaba fuera
  las tablas: una plantilla real ("REDUCATE 2026") llevaba once de sus
  catorce campos en celdas, y la app solo reconoció los tres del encabezado,
  sin decir por qué. Una tabla es la forma normal de maquetar una ficha en
  Word —dos columnas, rótulo y valor—, así que era justo donde más campos
  había.

  Se descartan los párrafos anidados dentro de otro párrafo (los de un cuadro
  de texto incrustado en un run): su texto ya viaja dentro del texto del
  párrafo que los contiene, y contarlos otra vez duplicaría cada campo.
*/
export function parrafosDelDocumento(documentXml: string): ParrafosDeCuerpo {
  const doc = new DOMParser().parseFromString(documentXml, 'application/xml')

  if (doc.getElementsByTagName('parsererror').length > 0) {
    return { doc, parrafos: [] }
  }

  const cuerpo = doc.getElementsByTagNameNS(NS_W, 'body')[0]
  if (cuerpo === undefined) {
    return { doc, parrafos: [] }
  }

  const parrafos = Array.from(cuerpo.getElementsByTagNameNS(NS_W, 'p')).filter(
    (parrafo) => !anidadoEnOtroParrafo(parrafo),
  )

  return { doc, parrafos }
}

function anidadoEnOtroParrafo(parrafo: Element): boolean {
  for (let padre = parrafo.parentElement; padre !== null; padre = padre.parentElement) {
    if (padre.localName === 'p' && padre.namespaceURI === NS_W) {
      return true
    }
  }

  return false
}

export function textoDeParrafo(parrafo: Element): string {
  return Array.from(parrafo.getElementsByTagNameNS(NS_W, 't'))
    .map((nodo) => nodo.textContent ?? '')
    .join('')
}

/*
  Reemplaza el texto visible de un párrafo por `nuevoTexto`, conservando
  únicamente el primer `w:r` (y su primer `w:t`) — estos párrafos son texto
  de control (`[[SI: ...]]`, `[[FIN REPETIR]]`, un `[[placeholder]]` simple),
  no contenido final, así que no hace falta preservar fidelidad run-por-run
  ahí: el resto del documento (todo lo que no es una marca) nunca pasa por
  esta función.
*/
export function reemplazarTextoDeParrafo(doc: Document, parrafo: Element, nuevoTexto: string): void {
  const runs = Array.from(parrafo.getElementsByTagNameNS(NS_W, 'r'))
  const primerRun = runs[0]

  if (primerRun === undefined) {
    return
  }

  for (const run of runs.slice(1)) {
    run.remove()
  }

  const textos = Array.from(primerRun.getElementsByTagNameNS(NS_W, 't'))
  for (const nodo of textos.slice(1)) {
    nodo.remove()
  }

  const primerTexto = textos[0]
  if (primerTexto === undefined) {
    const nuevo = doc.createElementNS(NS_W, 'w:t')
    nuevo.setAttribute('xml:space', 'preserve')
    nuevo.textContent = nuevoTexto
    primerRun.appendChild(nuevo)
    return
  }

  primerTexto.textContent = nuevoTexto
  primerTexto.setAttribute('xml:space', 'preserve')
}

export function serializarDocumento(doc: Document): string {
  return new XMLSerializer().serializeToString(doc)
}
