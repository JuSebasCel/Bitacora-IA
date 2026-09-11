import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'
import type { ResultadoDeConsulta } from '@/shared/supabase/consultas'
import type { CodigoError } from '@/shared/errors'

/*
  Caché compartida entre pantallas para una consulta de solo lectura (B13).

  Hasta ahora cada pantalla montaba su propio hook de dominio
  (`useConferenciasVisibles`, `useTemas`, ...) con su propio `useState`: salir
  del dashboard y volver a entrar era un componente nuevo que no sabía nada de
  lo que el anterior ya había traído. El resultado, tal como se vio usando la
  app de verdad: cada cambio de pestaña dispara de nuevo "buscando fichas" —
  aunque la sesión no haya cambiado un dato en diez segundos.

  Este módulo guarda el último resultado de cada consulta en un mapa a nivel
  de módulo, fuera de React, y lo comparte entre todos los componentes que
  pidan la misma clave con `useSyncExternalStore` — el primitivo pensado
  exactamente para suscribirse a un estado que vive fuera de React sin
  arriesgar una desincronización entre renders.

  Dos decisiones deliberadas:

  - Mostrar el dato cacheado de inmediato y revalidar en silencio (stale-
    while-revalidate), nunca mostrar "cargando" de nuevo si ya había algo que
    enseñar. Es la diferencia entre "se ve instantáneo" y "se ve cacheado
    pero sigue pareciendo lento".
  - Un TTL corto (`TTL_POR_DEFECTO_MS`) evita el viaje de red por completo
    cuando la vuelta a la pantalla ocurre segundos después de haberla dejado
    — el caso más común al navegar entre pestañas del mismo shell — sin dejar
    de refrescar cuando ha pasado tiempo real.

  No reemplaza `ResultadoDeConsulta`: lo envuelve. Cualquier repositorio de la
  serie B que ya devuelva esa forma se cachea sin cambios.
*/

type EstadoDeCache<T> =
  | { readonly fase: 'cargando' }
  | { readonly fase: 'listo'; readonly datos: T; readonly actualizadoEnMs: number }
  | { readonly fase: 'error'; readonly codigo: CodigoError; readonly actualizadoEnMs: number }

type EntradaDeCache<T> = {
  estado: EstadoDeCache<T>
  promesaEnCurso: Promise<void> | null
}

const TTL_POR_DEFECTO_MS = 20_000

const cache = new Map<string, EntradaDeCache<unknown>>()
const suscriptoresPorClave = new Map<string, Set<() => void>>()

function suscriptoresDe(clave: string): Set<() => void> {
  let conjunto = suscriptoresPorClave.get(clave)

  if (conjunto === undefined) {
    conjunto = new Set()
    suscriptoresPorClave.set(clave, conjunto)
  }

  return conjunto
}

function notificar(clave: string): void {
  for (const escuchar of suscriptoresDe(clave)) {
    escuchar()
  }
}

function suscribir(clave: string, escuchar: () => void): () => void {
  const conjunto = suscriptoresDe(clave)
  conjunto.add(escuchar)

  return () => {
    conjunto.delete(escuchar)
  }
}

const ESTADO_INICIAL: EstadoDeCache<never> = { fase: 'cargando' }

function obtenerSnapshot<T>(clave: string): EstadoDeCache<T> {
  return (cache.get(clave)?.estado as EstadoDeCache<T> | undefined) ?? ESTADO_INICIAL
}

/*
  Dispara la consulta si nadie más la tiene en curso para esa clave —dos
  componentes montando la misma pantalla a la vez comparten un único viaje de
  red, nunca dos— y guarda el resultado en la caché al resolver.
*/
function cargar<T>(clave: string, consultar: () => Promise<ResultadoDeConsulta<T>>): Promise<void> {
  const entrada = cache.get(clave) as EntradaDeCache<T> | undefined

  if (entrada?.promesaEnCurso !== null && entrada?.promesaEnCurso !== undefined) {
    return entrada.promesaEnCurso
  }

  const promesa = consultar().then((resultado) => {
    const actualizadoEnMs = Date.now()
    const nuevoEstado: EstadoDeCache<T> = resultado.ok
      ? { fase: 'listo', datos: resultado.datos, actualizadoEnMs }
      : { fase: 'error', codigo: resultado.codigo, actualizadoEnMs }

    cache.set(clave, { estado: nuevoEstado, promesaEnCurso: null })
    notificar(clave)
  })

  cache.set(clave, { estado: entrada?.estado ?? ESTADO_INICIAL, promesaEnCurso: promesa })

  return promesa
}

function estaFresco(estado: EstadoDeCache<unknown>, ttlMs: number): boolean {
  return estado.fase !== 'cargando' && Date.now() - estado.actualizadoEnMs < ttlMs
}

export type ValorDeConsultaCacheada<T> = {
  /** `undefined` solo en la primera carga real, sin nada previo que mostrar. */
  readonly datos: T | undefined
  /** Verdadero únicamente cuando no hay ningún dato —ni viejo— que enseñar todavía. */
  readonly cargando: boolean
  readonly codigoDeError: CodigoError | null
  /** Fuerza una relectura inmediata, saltándose el TTL: para después de escribir. */
  readonly invalidar: () => void
}

/*
  `clave` es `null` para desactivar la consulta a propósito (por ejemplo, sin
  sesión todavía) sin que el hook deje de poder llamarse siempre en el mismo
  orden.
*/
export function useConsultaCacheada<T>(
  clave: string | null,
  consultar: () => Promise<ResultadoDeConsulta<T>>,
  ttlMs: number = TTL_POR_DEFECTO_MS,
): ValorDeConsultaCacheada<T> {
  const claveActiva = clave ?? '__inactiva__'

  const estado = useSyncExternalStore(
    useCallback((escuchar) => suscribir(claveActiva, escuchar), [claveActiva]),
    () => obtenerSnapshot<T>(claveActiva),
  )

  /*
    `consultar` casi siempre es una función nueva en cada render (una arrow
    function inline). Guardarla en una ref evita que cambie la identidad del
    efecto de abajo en cada render sin obligar a quien llama a memorizarla.
  */
  const consultarRef = useRef(consultar)
  consultarRef.current = consultar

  useEffect(() => {
    if (clave === null) {
      return
    }

    if (estaFresco(obtenerSnapshot(claveActiva), ttlMs)) {
      return
    }

    void cargar(claveActiva, () => consultarRef.current())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveActiva, clave, ttlMs])

  const invalidar = useCallback(() => {
    if (clave === null) {
      return
    }

    void cargar(claveActiva, () => consultarRef.current())
  }, [clave, claveActiva])

  if (clave === null) {
    return { datos: undefined, cargando: false, codigoDeError: null, invalidar }
  }

  return {
    datos: estado.fase === 'listo' ? estado.datos : undefined,
    cargando: estado.fase === 'cargando',
    codigoDeError: estado.fase === 'error' ? estado.codigo : null,
    invalidar,
  }
}

/*
  Borra una clave (o todas, con un prefijo) de la caché sin volver a
  consultar: para cuando lo cierto es que el dato ya no aplica —cerrar
  sesión, por ejemplo— y no que haya que refrescarlo.
*/
export function invalidarCache(clave: string): void {
  cache.delete(clave)
  notificar(clave)
}

export function invalidarCacheConPrefijo(prefijo: string): void {
  for (const clave of cache.keys()) {
    if (clave.startsWith(prefijo)) {
      cache.delete(clave)
      notificar(clave)
    }
  }
}

/*
  Solo para pruebas: la caché vive a nivel de módulo y por lo tanto
  sobrevive entre `it()` de un mismo archivo. Sin este reinicio, una prueba
  que monte una pantalla con una clave ya usada por una prueba anterior
  recibiría el dato viejo cacheado en vez del que acaba de sembrar —un fallo
  que además depende del orden en que corran las pruebas, el peor tipo de
  intermitencia. Se llama desde `test/setup.ts` en cada `afterEach` global.
*/
export function reiniciarCachePorPruebas(): void {
  cache.clear()
  suscriptoresPorClave.clear()
}
