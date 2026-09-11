import { useCallback, useEffect, useState } from 'react'
import type { ReactElement, ReactNode } from 'react'
import { useSession } from '@/features/auth/session'
import { mensajeDeError } from '@/shared/errors'
import { supabase } from '@/shared/supabase/cliente'
import { ContextoApiKey } from './contextoApiKey'
import type { ResultadoDeAccion } from './contextoApiKey'

/*
  Estado de la API key, una sola vez para toda la sesión (B12).

  Antes cada consumidor (`MenuDeCuenta`, `PanelDeCarga`, `PantallaConfiguracion`)
  llamaba su propio `useApiKey(idUsuario)`, con su propio `useState` — tres
  copias independientes de la misma pregunta. Guardarla en Configuración
  actualizaba solo la copia de esa pantalla: `MenuDeCuenta` vive en
  `ShellLayout`, montado una sola vez para toda la sesión autenticada, así que
  su copia se quedaba mostrando "falta configurar la API key" hasta un
  recargado completo de la página — el bug que se vio al usar la app de
  verdad contra Supabase real, invisible en las pruebas porque cada una monta
  su propio componente aislado.

  La solución es una sola fuente de verdad: este `ProveedorDeApiKey` la lee
  una vez, vive en `ShellLayout` envolviendo toda la aplicación autenticada,
  y `useApiKey()` deja de aceptar un id de usuario -- lo toma de la sesión
  internamente, para que sea imposible llamarlo con el id equivocado.
*/

export function ProveedorDeApiKey({ children }: { children: ReactNode }): ReactElement {
  const { usuario } = useSession()
  const idUsuario = usuario?.id ?? ''

  const [clave, setClave] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let cancelado = false

    if (idUsuario === '') {
      setClave(null)
      setCargando(false)
      return
    }

    setCargando(true)

    supabase.rpc('leer_mi_api_key').then(({ data, error }) => {
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

  return (
    <ContextoApiKey.Provider value={{ clave, cargando, guardar, borrar }}>
      {children}
    </ContextoApiKey.Provider>
  )
}
