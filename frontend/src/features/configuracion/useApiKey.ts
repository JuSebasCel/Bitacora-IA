import { useCallback, useEffect, useState } from 'react'
import { mensajeDeError } from '@/shared/errors'
import { supabase } from '@/shared/supabase/cliente'

/*
  B2: la API key ya no vive en `sessionStorage` (texto plano, borrado junto
  con `almacenamiento.ts`) -- vive cifrada en Supabase Vault, detrás de tres
  funciones RPC que son el único punto de entrada (`guardar_mi_api_key`,
  `leer_mi_api_key`, `borrar_mi_api_key`, ver la migración de B2). Ninguna
  recibe el id de usuario: siempre `auth.uid()` del lado de Postgres, así que
  no hay forma de pedir o pisar la clave de otra persona desde el cliente.

  La lectura es ahora de red, no instantánea -- mismo motivo que
  `SessionProvider` ganó `cargando` en B1: sin este estado, la interfaz vería
  brevemente "no hay API key" incluso cuando sí la hay, mientras la promesa
  todavía no resuelve.
*/

export type ResultadoDeAccion = { readonly ok: true } | { readonly ok: false; readonly mensaje: string }

export type ValorDeApiKey = {
  readonly clave: string | null
  readonly cargando: boolean
  readonly guardar: (clave: string) => Promise<ResultadoDeAccion>
  readonly borrar: () => Promise<ResultadoDeAccion>
}

export function useApiKey(idUsuario: string): ValorDeApiKey {
  const [clave, setClave] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let cancelado = false
    setCargando(true)

    supabase
      .rpc('leer_mi_api_key')
      .then(({ data, error }) => {
        if (cancelado) return
        setClave(error || typeof data !== 'string' ? null : data)
        setCargando(false)
      })

    return () => {
      cancelado = true
    }
  }, [idUsuario])

  const guardar = useCallback(async (claveNueva: string): Promise<ResultadoDeAccion> => {
    const limpia = claveNueva.trim()

    if (limpia.length === 0) {
      return { ok: false, mensaje: mensajeDeError('CONFIG_API_KEY_REQUERIDA') }
    }

    const { error } = await supabase.rpc('guardar_mi_api_key', { clave: limpia })

    if (error) {
      return { ok: false, mensaje: mensajeDeError('CONFIG_API_KEY_FALLO_INESPERADO') }
    }

    setClave(limpia)
    return { ok: true }
  }, [])

  const borrar = useCallback(async (): Promise<ResultadoDeAccion> => {
    const { error } = await supabase.rpc('borrar_mi_api_key')

    if (error) {
      return { ok: false, mensaje: mensajeDeError('CONFIG_API_KEY_FALLO_INESPERADO') }
    }

    setClave(null)
    return { ok: true }
  }, [])

  return { clave, cargando, guardar, borrar }
}
