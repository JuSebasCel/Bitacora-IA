import { useCallback, useEffect, useState } from 'react'
import type { ReactElement, ReactNode } from 'react'
import { useSession } from '@/features/auth/session'
import { mensajeDeError } from '@/shared/errors'
import { supabase } from '@/shared/supabase/cliente'
import { AJUSTES_POR_DEFECTO, ContextoApiKey, PROPOSITOS } from './contextoApiKey'
import type { AjustesDeIa, PropositoDeClave, ResultadoDeAccion } from './contextoApiKey'

/*
  Estado de las claves de IA, una sola vez para toda la sesión (B12).

  Antes cada consumidor (`MenuDeCuenta`, `PanelDeCarga`, `PantallaConfiguracion`)
  llamaba su propio `useApiKey(idUsuario)`, con su propio `useState` — tres
  copias independientes de la misma pregunta. Guardarla en Configuración
  actualizaba solo la copia de esa pantalla: `MenuDeCuenta` vive en
  `ShellLayout`, montado una sola vez para toda la sesión autenticada, así que
  su copia se quedaba mostrando "falta configurar la API key" hasta un
  recargado completo de la página.

  La solución es una sola fuente de verdad: este `ProveedorDeApiKey` la lee
  una vez, vive en `ShellLayout` envolviendo toda la aplicación autenticada,
  y `useApiKey()` toma el usuario de la sesión internamente.

  Desde la migración 20260922130000 son tres claves, una por uso, más los
  ajustes de la administración: si comparte sus claves, nadie más necesita
  poner las suyas, y los avisos de "falta la clave" no tienen por qué salir.
*/

const SIN_CLAVES: Readonly<Record<PropositoDeClave, string | null>> = {
  transcripcion: null,
  fichas: null,
  chat: null,
}

function ajustesDesde(dato: unknown): AjustesDeIa {
  if (typeof dato !== 'object' || dato === null) {
    return AJUSTES_POR_DEFECTO
  }

  const crudo = dato as Record<string, unknown>
  return {
    clavesCompartidas: crudo.claves_compartidas === true,
    soyAdministracion: crudo.soy_administracion === true,
    limiteDiarioDeAudioS: typeof crudo.limite_diario_de_audio_s === 'number' ? crudo.limite_diario_de_audio_s : 0,
    audioUsadoHoyS: typeof crudo.audio_usado_hoy_s === 'number' ? crudo.audio_usado_hoy_s : 0,
  }
}

export function ProveedorDeApiKey({ children }: { children: ReactNode }): ReactElement {
  const { usuario } = useSession()
  const idUsuario = usuario?.id ?? ''

  const [claves, setClaves] = useState<Readonly<Record<PropositoDeClave, string | null>>>(SIN_CLAVES)
  const [ajustes, setAjustes] = useState<AjustesDeIa>(AJUSTES_POR_DEFECTO)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let cancelado = false

    if (idUsuario === '') {
      setClaves(SIN_CLAVES)
      setAjustes(AJUSTES_POR_DEFECTO)
      setCargando(false)
      return
    }

    setCargando(true)

    /*
      La de transcripción se pide sin argumentos: es el uso por defecto de la
      función, y así esta lectura es la misma que hacía la app antes de que
      hubiera varias claves.
    */
    const lecturas = PROPOSITOS.map((proposito) =>
      proposito === 'transcripcion'
        ? supabase.rpc('leer_mi_api_key')
        : supabase.rpc('leer_mi_api_key', { proposito }),
    )

    void Promise.all([...lecturas, supabase.rpc('ajustes_de_ia_para_mi')]).then((respuestas) => {
      if (cancelado) return

      const leidas = { ...SIN_CLAVES }
      PROPOSITOS.forEach((proposito, indice) => {
        const respuesta = respuestas[indice]
        leidas[proposito] =
          respuesta === undefined || respuesta.error || typeof respuesta.data !== 'string' ? null : respuesta.data
      })

      const deAjustes = respuestas[PROPOSITOS.length]
      setClaves(leidas)
      setAjustes(deAjustes === undefined || deAjustes.error ? AJUSTES_POR_DEFECTO : ajustesDesde(deAjustes.data))
      setCargando(false)
    })

    return () => {
      cancelado = true
    }
  }, [idUsuario])

  const guardar = useCallback(
    async (claveNueva: string, proposito: PropositoDeClave = 'transcripcion'): Promise<ResultadoDeAccion> => {
      const limpia = claveNueva.trim()

      if (limpia.length === 0) {
        return { ok: false, mensaje: mensajeDeError('CONFIG_API_KEY_REQUERIDA') }
      }

      const { error } = await supabase.rpc('guardar_mi_api_key', { clave: limpia, proposito })

      if (error) {
        return { ok: false, mensaje: mensajeDeError('CONFIG_API_KEY_FALLO_INESPERADO') }
      }

      setClaves((anteriores) => ({ ...anteriores, [proposito]: limpia }))
      return { ok: true }
    },
    [],
  )

  const borrar = useCallback(async (proposito: PropositoDeClave = 'transcripcion'): Promise<ResultadoDeAccion> => {
    const { error } = await supabase.rpc('borrar_mi_api_key', { proposito })

    if (error) {
      return { ok: false, mensaje: mensajeDeError('CONFIG_API_KEY_FALLO_INESPERADO') }
    }

    setClaves((anteriores) => ({ ...anteriores, [proposito]: null }))
    return { ok: true }
  }, [])

  /* RLS solo deja escribir los ajustes a la administración: para cualquier otra cuenta esto falla. */
  const cambiarClavesCompartidas = useCallback(async (compartidas: boolean): Promise<ResultadoDeAccion> => {
    const { error } = await supabase.from('ajustes_de_ia').update({ claves_compartidas: compartidas }).eq('id', true)

    if (error) {
      return { ok: false, mensaje: mensajeDeError('DATOS_FALLO_INESPERADO') }
    }

    setAjustes((anteriores) => ({ ...anteriores, clavesCompartidas: compartidas }))
    return { ok: true }
  }, [])

  const clave = claves.transcripcion ?? claves.fichas ?? claves.chat
  const puedeUsarIa = clave !== null || ajustes.clavesCompartidas

  return (
    <ContextoApiKey.Provider
      value={{ claves, clave, puedeUsarIa, ajustes, cargando, guardar, borrar, cambiarClavesCompartidas }}
    >
      {children}
    </ContextoApiKey.Provider>
  )
}
