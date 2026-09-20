import { useMemo } from 'react'
import { mensajeDeError } from '@/shared/errors'
import { useConsultaCacheada } from '@/shared/cache/useConsultaCacheada'
import type { ResultadoDeConsulta } from '@/shared/supabase/consultas'
import { listarConferencias, listarFichasVisibles } from '../repositorio'
import { conferenciasVisibles } from '../query'
import type { ConferenciaVisible } from '../query'
import type { Conferencia, Ficha } from '../data'

/*
  Lo que una persona puede ver, con su estado de carga.

  Antes de B5 los datos venían de un fixture y del propio navegador. Ahora
  salen de dos consultas a Supabase que RLS ya filtró por identidad, así que
  el listado nunca trae una conferencia ajena aunque se pida `select('*')`
  sin condiciones. `conferenciasVisibles` sigue corriendo encima: dejó de ser
  la única puerta y pasó a derivar procedencia (propia o compartida) y
  privacidad efectiva sobre filas que Postgres ya autorizó — que la interfaz
  y la base de datos coincidan es lo que hace que un fallo en cualquiera de
  las dos se note.

  Las fichas visibles se traen en una sola consulta y no una por conferencia:
  el catálogo y el chat cruzan fichas de varias charlas a la vez.

  Desde B13 las dos consultas pasan por `useConsultaCacheada`: es el hook de
  dominio más montado de toda la app (dashboard, catálogo, chat, detalle de
  memoria), así que era el que más se notaba al navegar entre pestañas — cada
  pantalla nueva repetía "buscando fichas" aunque nada hubiera cambiado en
  Supabase en los últimos segundos. `recargar` ahora es `invalidar()`: fuerza
  una relectura inmediata sin esperar el TTL, para el caso real (se acaba de
  cargar una conferencia) donde sí hace falta el dato fresco ya mismo.
*/

export type EstadoDeCarga = 'cargando' | 'listo'

export type ConferenciasVisibles = {
  readonly carga: EstadoDeCarga
  readonly todas: readonly Conferencia[]
  readonly visibles: readonly ConferenciaVisible[]
  readonly fichas: readonly Ficha[]
  /** Mensaje ya traducido si la consulta falló; null si todo fue bien. */
  readonly error: string | null
  readonly recargar: () => void
}

type DatosDeConferencias = {
  readonly conferencias: readonly Conferencia[]
  readonly fichas: readonly Ficha[]
}

/*
  Combina las dos consultas en un solo resultado cacheable. Un fallo en
  cualquiera de las dos se trata como fallo del conjunto: repartir el error
  ficha a ficha (visibles sin fichas, fichas sin visibles) complicaba el tipo
  de la caché sin que ninguna pantalla distinguiera hoy entre esos dos casos.
*/
async function consultarConferenciasYFichas(): Promise<ResultadoDeConsulta<DatosDeConferencias>> {
  const [conferencias, fichas] = await Promise.all([listarConferencias(), listarFichasVisibles()])

  if (!conferencias.ok) {
    return conferencias
  }

  if (!fichas.ok) {
    return fichas
  }

  return { ok: true, datos: { conferencias: conferencias.datos, fichas: fichas.datos } }
}

export function useConferenciasVisibles(idUsuario: string): ConferenciasVisibles {
  const clave = idUsuario === '' ? null : `conferencias-visibles:${idUsuario}`

  const { datos, cargando, codigoDeError, invalidar } = useConsultaCacheada(
    clave,
    consultarConferenciasYFichas,
  )

  const visibles = useMemo(
    () => (datos === undefined ? [] : conferenciasVisibles(datos.conferencias, idUsuario)),
    [datos, idUsuario],
  )

  return {
    carga: cargando ? 'cargando' : 'listo',
    /*
      Tambien las crudas: las invitaciones sin contestar quedan fuera de
      `visibles` a proposito —no son conferencias del archivo— pero la campana
      necesita verlas para poder ofrecerlas.
    */
    todas: datos?.conferencias ?? [],
    visibles,
    fichas: datos?.fichas ?? [],
    error: codigoDeError === null ? null : mensajeDeError(codigoDeError),
    recargar: invalidar,
  }
}
