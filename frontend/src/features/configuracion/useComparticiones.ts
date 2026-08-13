import { useCallback, useState } from 'react'
import type { Comparticion, Conferencia, PrivacidadDeComparticion } from '@/features/conferencias/data'
import { mensajeDeError } from '@/shared/errors'
import { agregarComparticion, leerComparticionesAgregadas } from './comparticiones/almacenamiento'
import { crearInvitacion } from './comparticiones/comparticiones'

export type ResultadoDeAccion = { readonly ok: true } | { readonly ok: false; readonly mensaje: string }

export type ValorDeComparticiones = {
  readonly agregadas: Readonly<Record<string, readonly Comparticion[]>>
  readonly invitar: (
    conferencia: Conferencia | null,
    idInvitado: string,
    puedeCompartir: boolean,
    privacidad: PrivacidadDeComparticion,
  ) => ResultadoDeAccion
}

/*
  Envoltorio fino: `crearInvitacion` (pura, probada aparte) decide si la
  invitación es válida, este hook solo persiste el resultado y fuerza el
  re-render para que las pantallas que ya leen `conferenciasVisibles` vean la
  conferencia recién compartida sin recargar.
*/
export function useComparticiones(): ValorDeComparticiones {
  const [agregadas, setAgregadas] = useState(() => leerComparticionesAgregadas())

  const invitar = useCallback(
    (
      conferencia: Conferencia | null,
      idInvitado: string,
      puedeCompartir: boolean,
      privacidad: PrivacidadDeComparticion,
    ): ResultadoDeAccion => {
      if (conferencia === null) {
        return { ok: false, mensaje: mensajeDeError('CONFIG_CONFERENCIA_REQUERIDA') }
      }

      const resultado = crearInvitacion(conferencia, idInvitado, puedeCompartir, privacidad)

      if (!resultado.ok) {
        return { ok: false, mensaje: mensajeDeError(resultado.codigo) }
      }

      agregarComparticion(conferencia.id, resultado.comparticion)
      setAgregadas(leerComparticionesAgregadas())

      return { ok: true }
    },
    [],
  )

  return { agregadas, invitar }
}
