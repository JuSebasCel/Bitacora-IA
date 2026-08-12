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

/** Solo párrafos que son hijos directos de `<w:body>` — los que viven dentro de una tabla quedan fuera a propósito. */
export function parrafosDeNivelSuperior(documentXml: string): ParrafosDeCuerpo {
  const doc = new DOMParser().parseFromString(documentXml, 'application/xml')

  if (doc.getElementsByTagName('parsererror').length > 0) {
    return { doc, parrafos: [] }
  }

  const cuerpo = doc.getElementsByTagNameNS(NS_W, 'body')[0]
  if (cuerpo === undefined) {
    return { doc, parrafos: [] }
  }

  const parrafos = Array.from(cuerpo.children).filter(
    (hijo): hijo is Element => hijo.localName === 'p' && hijo.namespaceURI === NS_W,
  )

  return { doc, parrafos }
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
