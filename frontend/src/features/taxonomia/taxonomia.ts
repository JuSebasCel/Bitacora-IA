import { normalizarTexto } from '@/features/conferencias/query'
import { LARGO_MAXIMO_DE_TEMA } from '@/shared/errors'
import type { CodigoError } from '@/shared/errors'
import type { Taxonomia, Tema, TemaPropuesto } from './data/tipos'

/*
  Operaciones puras sobre la taxonomía.

  Mismo criterio que `conferencias/directorio/directorio.ts`: nunca lanzan,
  nunca mutan lo que reciben, el fallo viaja como código de error. Reciben la
  taxonomía completa y devuelven una nueva, para que el hook solo tenga que
  guardar el resultado.
*/

export type ResultadoDeTaxonomia =
  | { readonly ok: true; readonly taxonomia: Taxonomia }
  | { readonly ok: false; readonly codigo: CodigoError }

function idParaTema(nombre: string): string {
  const base = normalizarTexto(nombre)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return `tem-${base.length > 0 ? base : 'sin-nombre'}`
}

/*
  La comparación es normalizada (sin tildes, sin mayúsculas) y no literal:
  "Sesgos Algorítmicos" y "sesgos algoritmicos" son el mismo tema, y dejar
  entrar los dos es la dispersión de vocabulario que la taxonomía controlada
  existe para evitar.
*/
function yaExisteElNombre(temas: readonly Tema[], nombre: string, idAExcluir?: string): boolean {
  const comparable = normalizarTexto(nombre)

  return temas.some((tema) => tema.id !== idAExcluir && normalizarTexto(tema.nombre) === comparable)
}

function validarNombre(temas: readonly Tema[], nombre: string, idAExcluir?: string): CodigoError | null {
  const limpio = nombre.trim()

  if (limpio.length === 0) {
    return 'TAX_TEMA_NOMBRE_REQUERIDO'
  }

  if (limpio.length > LARGO_MAXIMO_DE_TEMA) {
    return 'TAX_TEMA_NOMBRE_MUY_LARGO'
  }

  if (yaExisteElNombre(temas, limpio, idAExcluir)) {
    return 'TAX_TEMA_YA_EXISTE'
  }

  return null
}

/** Resuelve el nombre visible de un tema. Único punto donde se traduce id a nombre. */
export function nombreDeTema(temas: readonly Tema[], idTema: string): string {
  return temas.find((tema) => tema.id === idTema)?.nombre ?? 'Tema retirado'
}

function buscarPropuesta(taxonomia: Taxonomia, idPropuesta: string): TemaPropuesto | undefined {
  return taxonomia.propuestas.find((propuesta) => propuesta.id === idPropuesta)
}

/*
  Aprobar hace las dos cosas de una vez: mete el tema al pool general y lo
  deja activo en el evento que lo propuso. Separarlo en dos pasos dejaría el
  tema aprobado pero inservible en el evento donde hacía falta.

  Si el nombre choca con uno que ya está en el pool, la aprobación falla: ese
  choque es precisamente el duplicado que la curaduría existe para atrapar.
*/
export function aprobarPropuesta(taxonomia: Taxonomia, idPropuesta: string): ResultadoDeTaxonomia {
  const propuesta = buscarPropuesta(taxonomia, idPropuesta)

  if (propuesta === undefined) {
    return { ok: false, codigo: 'TAX_PROPUESTA_NO_ENCONTRADA' }
  }

  const codigo = validarNombre(taxonomia.temas, propuesta.nombre)

  if (codigo !== null) {
    return { ok: false, codigo }
  }

  const nuevo: Tema = { id: idParaTema(propuesta.nombre), nombre: propuesta.nombre.trim() }

  return {
    ok: true,
    taxonomia: {
      temas: [...taxonomia.temas, nuevo],
      activos: [...taxonomia.activos, { idEvento: propuesta.idEvento, idTema: nuevo.id }],
      propuestas: taxonomia.propuestas.filter((otra) => otra.id !== idPropuesta),
    },
  }
}

export function rechazarPropuesta(taxonomia: Taxonomia, idPropuesta: string): ResultadoDeTaxonomia {
  if (buscarPropuesta(taxonomia, idPropuesta) === undefined) {
    return { ok: false, codigo: 'TAX_PROPUESTA_NO_ENCONTRADA' }
  }

  return {
    ok: true,
    taxonomia: {
      ...taxonomia,
      propuestas: taxonomia.propuestas.filter((otra) => otra.id !== idPropuesta),
    },
  }
}
