import { useCallback, useEffect, useState } from 'react'
import type { ReactElement, ReactNode } from 'react'
import { useSession } from '@/features/auth/session'
import { mensajeDeError } from '@/shared/errors'
import { supabase } from '@/shared/supabase/cliente'
import { ContextoApiKey } from './contextoApiKey'
import type { PropositoDeClave, ResultadoDeAccion } from './contextoApiKey'

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
  const [claveDeChat, setClaveDeChat] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let cancelado = false

    if (idUsuario === '') {
      setClave(null)
      setClaveDeChat(null)
      setCargando(false)
      return
    }

    setCargando(true)

    /*
      La de análisis se pide sin argumentos: `analisis` es el propósito por
      defecto de la función, y así esta lectura es la misma que hacía la app
      antes de que hubiera dos claves.
    */
    const deAnalisis = supabase.rpc('leer_mi_api_key')
    const deChat = supabase.rpc('leer_mi_api_key', { proposito: 'chat' })

    void Promise.all([deAnalisis, deChat]).then(([analisis, chat]) => {
      if (cancelado) return
      setClave(analisis.error || typeof analisis.data !== 'string' ? null : analisis.data)
      setClaveDeChat(chat.error || typeof chat.data !== 'string' ? null : chat.data)
      setCargando(false)
    })

    return () => {
      cancelado = true
    }
  }, [idUsuario])

  const guardar = useCallback(
    async (claveNueva: string, proposito: PropositoDeClave = 'analisis'): Promise<ResultadoDeAccion> => {
      const limpia = claveNueva.trim()

      if (limpia.length === 0) {
        return { ok: false, mensaje: mensajeDeError('CONFIG_API_KEY_REQUERIDA') }
      }

      const { error } = await supabase.rpc('guardar_mi_api_key', { clave: limpia, proposito })

      if (error) {
        return { ok: false, mensaje: mensajeDeError('CONFIG_API_KEY_FALLO_INESPERADO') }
      }

      if (proposito === 'chat') {
        setClaveDeChat(limpia)
      } else {
        setClave(limpia)
      }
      return { ok: true }
    },
    [],
  )

  const borrar = useCallback(async (proposito: PropositoDeClave = 'analisis'): Promise<ResultadoDeAccion> => {
    const { error } = await supabase.rpc('borrar_mi_api_key', { proposito })

    if (error) {
      return { ok: false, mensaje: mensajeDeError('CONFIG_API_KEY_FALLO_INESPERADO') }
    }

    if (proposito === 'chat') {
      setClaveDeChat(null)
    } else {
      setClave(null)
    }
    return { ok: true }
  }, [])

  return (
    <ContextoApiKey.Provider value={{ clave, claveDeChat, cargando, guardar, borrar }}>
      {children}
    </ContextoApiKey.Provider>
  )
}
