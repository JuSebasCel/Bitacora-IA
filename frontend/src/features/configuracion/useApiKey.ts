import { useCallback, useState } from 'react'
import { mensajeDeError } from '@/shared/errors'
import { guardarApiKey, leerApiKey } from './almacenamiento'

export type ResultadoDeAccion = { readonly ok: true } | { readonly ok: false; readonly mensaje: string }

export type ValorDeApiKey = {
  readonly clave: string | null
  readonly guardar: (clave: string) => ResultadoDeAccion
}

export function useApiKey(idUsuario: string): ValorDeApiKey {
  const [estado, setEstado] = useState<{ idUsuario: string; clave: string | null }>(() => ({
    idUsuario,
    clave: leerApiKey(idUsuario),
  }))

  if (estado.idUsuario !== idUsuario) {
    setEstado({ idUsuario, clave: leerApiKey(idUsuario) })
  }

  const guardar = useCallback(
    (clave: string): ResultadoDeAccion => {
      const limpia = clave.trim()

      if (limpia.length === 0) {
        return { ok: false, mensaje: mensajeDeError('CONFIG_API_KEY_REQUERIDA') }
      }

      guardarApiKey(idUsuario, limpia)
      setEstado({ idUsuario, clave: limpia })

      return { ok: true }
    },
    [idUsuario],
  )

  return { clave: estado.idUsuario === idUsuario ? estado.clave : leerApiKey(idUsuario), guardar }
}
