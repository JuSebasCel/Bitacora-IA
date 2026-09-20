import { useCallback, useEffect, useState } from 'react'
import { mensajeDeError } from '@/shared/errors'
import { invalidarCache, useConsultaCacheada } from '@/shared/cache/useConsultaCacheada'
import { TAXONOMIA_VACIA } from './data/tipos'
import type { Taxonomia } from './data/tipos'
import {
  aprobarPropuestaRemota,
  leerTaxonomiaRemota,
  rechazarPropuestaRemota,
} from './repositorio'
import { aprobarPropuesta, rechazarPropuesta } from './taxonomia'

/*
  Estado de la taxonomía compartida, cargada de Supabase (B4).

  Solo aprobar/rechazar: nadie crea, renombra ni elimina un tema a mano. El
  pool crece únicamente por curaduría de lo que el análisis de discurso
  propuso (`PLAN.md` sección 3.1).

  Las reglas puras de `taxonomia.ts` no se tiran: se usan como comprobación
  previa, para que un nombre duplicado dé `TAX_TEMA_YA_EXISTE` —con su
  explicación de por qué el vocabulario repetido rompe la comparación entre
  eventos— en vez del `DATOS_CONFLICTO` genérico que devolvería la restricción
  `unique` de Postgres. La base de datos sigue siendo la que manda: si algo
  cambió entre la lectura y la escritura, su rechazo se traduce igual.

  Cada acción devuelve el mensaje ya traducido en el momento de intentarla,
  mismo criterio que `alCrearEtiqueta` en el dashboard: quien la disparó
  decide por sí solo si cierra su diálogo o se queda con el error.

  Este hook (la curaduría, con propuestas) se queda sin caché a propósito: lo
  monta un solo lugar (`NotificacionesDropdown`) y siempre necesita el dato
  fresco de propuestas pendientes. Lo que sí se cachea es `useTemas`, más
  abajo, que es el que se remonta en cada pantalla que resuelve el nombre de
  una ficha.
*/

export type ResultadoDeAccion = { readonly ok: true } | { readonly ok: false; readonly mensaje: string }

export type ValorDeTaxonomia = {
  readonly taxonomia: Taxonomia
  readonly cargando: boolean
  readonly aprobar: (idPropuesta: string) => Promise<ResultadoDeAccion>
  readonly rechazar: (idPropuesta: string) => Promise<ResultadoDeAccion>
  readonly recargar: () => void
}

/** Todas las pantallas leen el mismo pool de temas: una sola clave, sin variar por usuario. */
const CLAVE_TEMAS = 'taxonomia:temas'

export function useTaxonomia(): ValorDeTaxonomia {
  const [taxonomia, setTaxonomia] = useState<Taxonomia>(TAXONOMIA_VACIA)
  const [cargando, setCargando] = useState(true)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let cancelado = false
    setCargando(true)

    leerTaxonomiaRemota().then((respuesta) => {
      if (cancelado) return
      if (respuesta.ok) {
        setTaxonomia(respuesta.datos)
      }
      setCargando(false)
    })

    return () => {
      cancelado = true
    }
  }, [version])

  const recargar = useCallback(() => setVersion((anterior) => anterior + 1), [])

  /*
    Aprobar o rechazar cambia el pool de temas: la caché de `useTemas` en
    otras pantallas quedaría mostrando el nombre viejo de una ficha hasta que
    venciera su TTL. Se invalida aquí mismo, en el único lugar donde el pool
    puede cambiar.
  */
  function aplicar(
    respuesta: Awaited<ReturnType<typeof aprobarPropuestaRemota>>,
  ): ResultadoDeAccion {
    if (!respuesta.ok) {
      return { ok: false, mensaje: mensajeDeError(respuesta.codigo) }
    }

    setTaxonomia(respuesta.datos)
    invalidarCache(CLAVE_TEMAS)
    return { ok: true }
  }

  const aprobar = useCallback(
    async (idPropuesta: string): Promise<ResultadoDeAccion> => {
      const propuesta = taxonomia.propuestas.find((otra) => otra.id === idPropuesta)

      if (propuesta === undefined) {
        return { ok: false, mensaje: mensajeDeError('TAX_PROPUESTA_NO_ENCONTRADA') }
      }

      const previo = aprobarPropuesta(taxonomia, idPropuesta)
      if (!previo.ok) {
        return { ok: false, mensaje: mensajeDeError(previo.codigo) }
      }

      return aplicar(await aprobarPropuestaRemota(propuesta))
    },
    [taxonomia],
  )

  const rechazar = useCallback(
    async (idPropuesta: string): Promise<ResultadoDeAccion> => {
      const previo = rechazarPropuesta(taxonomia, idPropuesta)
      if (!previo.ok) {
        return { ok: false, mensaje: mensajeDeError(previo.codigo) }
      }

      return aplicar(await rechazarPropuestaRemota(idPropuesta))
    },
    [taxonomia],
  )

  return { taxonomia, cargando, aprobar, rechazar, recargar }
}

/*
  Solo el pool de temas, para resolver el nombre de una ficha. Lo usan el
  catálogo, el chat y el detalle de una conferencia o memoria: ninguno
  necesita las propuestas ni los activos por evento, y cargar la taxonomía
  completa en cada uno multiplicaría las consultas sin motivo.

  Cacheado (B13): es vocabulario del grupo, cambia solo cuando alguien
  aprueba o rechaza una propuesta —algo que `useTaxonomia.aprobar/rechazar`
  ya invalida explícitamente— así que entre esos eventos no hace falta
  releerlo cada vez que se monta una pantalla nueva.
*/
export type ValorDeTemas = {
  readonly temas: Taxonomia['temas']
  readonly cargando: boolean
  /**
   * Vuelve a pedir el pool.
   *
   * Hace falta porque el análisis **crea temas mientras corre**: una ficha
   * puede quedar apuntando a uno que esta caché todavía no conoce, y entonces
   * la pantalla la etiqueta como "Tema retirado" cuando en realidad es un
   * tema recién nacido.
   */
  readonly recargar: () => void
}

export function useTemas(): ValorDeTemas {
  const { datos, cargando, invalidar } = useConsultaCacheada(CLAVE_TEMAS, async () => {
    const respuesta = await leerTaxonomiaRemota()
    return respuesta.ok ? { ok: true, datos: respuesta.datos.temas } : respuesta
  })

  return { temas: datos ?? [], cargando, recargar: invalidar }
}
