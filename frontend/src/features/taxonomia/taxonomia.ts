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

/** Los temas activos de un evento, ya resueltos y en orden alfabético. */
export function temasActivosDe(taxonomia: Taxonomia, idEvento: string): readonly Tema[] {
  const idsActivos = new Set(
    taxonomia.activos.filter((activo) => activo.idEvento === idEvento).map((activo) => activo.idTema),
  )

  return taxonomia.temas
    .filter((tema) => idsActivos.has(tema.id))
    .toSorted((izquierda, derecha) => izquierda.nombre.localeCompare(derecha.nombre))
}

export function crearTema(taxonomia: Taxonomia, nombre: string): ResultadoDeTaxonomia {
  const codigo = validarNombre(taxonomia.temas, nombre)

  if (codigo !== null) {
    return { ok: false, codigo }
  }

  const limpio = nombre.trim()

  return {
    ok: true,
    taxonomia: { ...taxonomia, temas: [...taxonomia.temas, { id: idParaTema(limpio), nombre: limpio }] },
  }
}

/*
  Renombrar cambia solo el nombre, nunca el id: las fichas apuntan al id, así
  que corregir cómo se escribe un tema no puede desligarlas de él. Es la razón
  por la que la ficha guarda `idTema` y no el nombre.
*/
export function renombrarTema(taxonomia: Taxonomia, idTema: string, nombre: string): ResultadoDeTaxonomia {
  if (!taxonomia.temas.some((tema) => tema.id === idTema)) {
    return { ok: false, codigo: 'TAX_TEMA_NO_ENCONTRADO' }
  }

  const codigo = validarNombre(taxonomia.temas, nombre, idTema)

  if (codigo !== null) {
    return { ok: false, codigo }
  }

  const limpio = nombre.trim()

  return {
    ok: true,
    taxonomia: {
      ...taxonomia,
      temas: taxonomia.temas.map((tema) => (tema.id === idTema ? { ...tema, nombre: limpio } : tema)),
    },
  }
}

/*
  Un tema en uso no se puede eliminar: las fichas que lo referencian quedarían
  apuntando a nada, y la pantalla del catálogo mostraría un hueco sin forma de
  arreglarlo. Quien lo quiera fuera de un evento concreto tiene `desactivar`,
  que es la operación reversible.

  `idsTemasEnUso` llega desde afuera en vez de calcularse aquí porque este
  archivo no conoce las fichas: la taxonomía no debe depender del dominio de
  conferencias, solo al revés.
*/
export function eliminarTema(
  taxonomia: Taxonomia,
  idTema: string,
  idsTemasEnUso: readonly string[],
): ResultadoDeTaxonomia {
  if (!taxonomia.temas.some((tema) => tema.id === idTema)) {
    return { ok: false, codigo: 'TAX_TEMA_NO_ENCONTRADO' }
  }

  if (idsTemasEnUso.includes(idTema)) {
    return { ok: false, codigo: 'TAX_TEMA_EN_USO' }
  }

  return {
    ok: true,
    taxonomia: {
      ...taxonomia,
      temas: taxonomia.temas.filter((tema) => tema.id !== idTema),
      activos: taxonomia.activos.filter((activo) => activo.idTema !== idTema),
    },
  }
}

export function activarEnEvento(taxonomia: Taxonomia, idEvento: string, idTema: string): ResultadoDeTaxonomia {
  if (!taxonomia.temas.some((tema) => tema.id === idTema)) {
    return { ok: false, codigo: 'TAX_TEMA_NO_ENCONTRADO' }
  }

  const yaActivo = taxonomia.activos.some(
    (activo) => activo.idEvento === idEvento && activo.idTema === idTema,
  )

  if (yaActivo) {
    return { ok: true, taxonomia }
  }

  return { ok: true, taxonomia: { ...taxonomia, activos: [...taxonomia.activos, { idEvento, idTema }] } }
}

/*
  Desactivar no toca las fichas ya clasificadas con ese tema: solo deja de
  ofrecerlo para clasificaciones nuevas de ese evento. Borrar el historial
  por cambiar una preferencia de configuración sería un daño desproporcionado.
*/
export function desactivarEnEvento(taxonomia: Taxonomia, idEvento: string, idTema: string): ResultadoDeTaxonomia {
  return {
    ok: true,
    taxonomia: {
      ...taxonomia,
      activos: taxonomia.activos.filter(
        (activo) => !(activo.idEvento === idEvento && activo.idTema === idTema),
      ),
    },
  }
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
