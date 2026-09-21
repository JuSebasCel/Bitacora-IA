import type { Memoria } from './data'

/*
  La última lista de memorias leída, para no volver al esqueleto en cada
  visita.

  Mismo arreglo que `plantillas/listaRecordada.ts`: sin esto, pasar de otra
  sección a Memorias enseñaba el esqueleto aunque nada hubiera cambiado,
  porque la lista vivía dentro del componente y moría al salir. Ahora se
  enseña al instante lo último que se vio y se relee detrás.

  Va con el id de quien la leyó: al cambiar de cuenta en la misma pestaña,
  la lista de la anterior no puede asomarse ni un instante.

  En su propio módulo, sin dependencias, para que `test/setup.ts` pueda
  vaciarlo sin importar el gancho, que arrastraría el repositorio real antes
  de que cada prueba lo sustituya.
*/
let ultima: { readonly idUsuario: string; readonly memorias: readonly Memoria[] } | null = null

const CLAVE_DE_CUANTAS = 'menti-vault:cuantas-memorias'

export function memoriasRecordadas(idUsuario: string): readonly Memoria[] | null {
  return ultima !== null && ultima.idUsuario === idUsuario ? ultima.memorias : null
}

export function recordarMemorias(idUsuario: string, memorias: readonly Memoria[]): void {
  ultima = { idUsuario, memorias }

  try {
    localStorage.setItem(CLAVE_DE_CUANTAS, String(memorias.length))
  } catch {
    /* Sin almacenamiento el esqueleto cae a una sola tarjeta; nada más depende de esto. */
  }
}

/*
  Cuántas había la última vez, para que el esqueleto dibuje esas tarjetas y
  no un número fijo. Sobrevive a recargar la página, que es justo cuando se
  ve el esqueleto. Solo el número: las memorias viven en Supabase.
*/
export function cuantasMemoriasHabia(): number | null {
  if (ultima !== null) {
    return ultima.memorias.length
  }

  try {
    const guardado = Number.parseInt(localStorage.getItem(CLAVE_DE_CUANTAS) ?? '', 10)
    return Number.isNaN(guardado) ? null : guardado
  } catch {
    return null
  }
}

/** Solo para pruebas: cada una empieza sin nada recordado de la anterior. */
export function olvidarMemoriasPorPruebas(): void {
  ultima = null
}
