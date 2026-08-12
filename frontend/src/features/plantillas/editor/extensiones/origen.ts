import type { CampoDeMarcador, OrigenDeMarcador } from '../../data'

/*
  `OrigenDeMarcador` (el tipo de dominio) es una unión discriminada; los
  atributos de un nodo de ProseMirror son un objeto plano. Estas dos
  funciones son la única frontera de conversión entre ambos, usada por los
  tres sitios que necesitan un origen: el nodo `marcador`, el nodo
  `seccionMarcador` y el importador de `.docx`.
*/
export type AttrsDeOrigen = {
  readonly origenTipo: 'campo' | 'personalizado'
  readonly campo: CampoDeMarcador | null
  readonly etiquetaPersonalizada: string | null
}

export function origenDesdeAttrs(attrs: AttrsDeOrigen): OrigenDeMarcador {
  if (attrs.origenTipo === 'campo' && attrs.campo !== null) {
    return { tipo: 'campo', campo: attrs.campo }
  }

  return { tipo: 'personalizado', etiqueta: attrs.etiquetaPersonalizada ?? '' }
}

export function attrsDesdeOrigen(origen: OrigenDeMarcador): AttrsDeOrigen {
  return origen.tipo === 'campo'
    ? { origenTipo: 'campo', campo: origen.campo, etiquetaPersonalizada: null }
    : { origenTipo: 'personalizado', campo: null, etiquetaPersonalizada: origen.etiqueta }
}
