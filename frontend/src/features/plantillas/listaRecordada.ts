import type { Plantilla } from './data'

/*
  La última lista leída, a nivel de módulo, para no volver a esperar la red
  en cada visita.

  Sin esto, cada vez que se entraba a Plantillas —aunque nada hubiera
  cambiado— la pantalla volvía al esqueleto mientras se releía la lista:
  el estado vivía dentro del componente y moría al salir de la sección.
  Ahora se enseña al instante lo último que se vio y se relee detrás, igual
  que `useConsultaCacheada` en el resto de la app. No se usa ese mismo gancho
  porque este tiene escrituras optimistas con guardado diferido, y encajarlas
  en su caché compartida pedía más maquinaria que la que ahorraba.

  Vive en su propio módulo, sin dependencias, para que la preparación de las
  pruebas pueda vaciarla sin importar el gancho: importarlo arrastraba el
  repositorio real antes de que cada archivo de prueba lo sustituyera, y todas
  las pruebas de plantillas terminaban hablando con un Supabase inexistente.
*/
let ultimaLista: readonly Plantilla[] | null = null
/*
  De quién es la lista recordada. Desde que las plantillas son privadas por
  cuenta, al cambiar de cuenta en la misma pestaña la lista de la anterior
  no puede asomarse ni un instante.
*/
let duenoDeLaLista: string | null = null

export function listaRecordada(idUsuario: string): readonly Plantilla[] | null {
  return duenoDeLaLista === idUsuario ? ultimaLista : null
}

export function recordarLista(idUsuario: string, plantillas: readonly Plantilla[]): void {
  ultimaLista = plantillas
  duenoDeLaLista = idUsuario

  try {
    localStorage.setItem(CLAVE_DE_CUANTAS, String(plantillas.length))
  } catch {
    /* Sin almacenamiento el esqueleto cae a una sola hoja; nada más depende de esto. */
  }
}

/*
  Cuántas plantillas había la última vez, para que el esqueleto dibuje ese
  número de hojas y no uno fijo.

  La lista recordada muere al recargar la página, que es justo cuando se ve el
  esqueleto; el número se guarda aparte en `localStorage` para sobrevivir a
  eso. Solo el número: guardar las plantillas enteras pondría en el navegador
  datos de la cuenta que ya viven en Supabase.
*/
const CLAVE_DE_CUANTAS = 'menti-vault:cuantas-plantillas'

export function cuantasHabia(): number | null {
  if (ultimaLista !== null) {
    return ultimaLista.length
  }

  try {
    const guardado = Number.parseInt(localStorage.getItem(CLAVE_DE_CUANTAS) ?? '', 10)
    return Number.isNaN(guardado) ? null : guardado
  } catch {
    return null
  }
}

/** Solo para pruebas: cada una empieza sin nada recordado de la anterior. */
export function olvidarPlantillasPorPruebas(): void {
  ultimaLista = null
  duenoDeLaLista = null
}
