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

export function listaRecordada(): readonly Plantilla[] | null {
  return ultimaLista
}

export function recordarLista(plantillas: readonly Plantilla[]): void {
  ultimaLista = plantillas
}

/** Solo para pruebas: cada una empieza sin nada recordado de la anterior. */
export function olvidarPlantillasPorPruebas(): void {
  ultimaLista = null
}
