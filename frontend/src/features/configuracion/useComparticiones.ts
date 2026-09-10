import { useCallback } from 'react'
import type { Conferencia, PrivacidadDeComparticion } from '@/features/conferencias/data'
import { mensajeDeError } from '@/shared/errors'
import { crearInvitacion } from './comparticiones/comparticiones'
import { crearComparticion } from './comparticiones/repositorio'

export type ResultadoDeAccion = { readonly ok: true } | { readonly ok: false; readonly mensaje: string }

export type ValorDeComparticiones = {
  readonly invitar: (
    conferencia: Conferencia | null,
    idInvitado: string,
    puedeCompartir: boolean,
    privacidad: PrivacidadDeComparticion,
  ) => Promise<ResultadoDeAccion>
}

/*
  `crearInvitacion` (pura, probada aparte) decide si la invitación tiene
  sentido con lo que se sabe en el cliente —conferencia elegida, invitado
  elegido, permiso para compartir, no duplicada entre lo ya visible—. Este
  hook la persiste.

  El `puedeCompartir` que recibe ya viene resuelto por la capa de acceso
  (`privacidadEfectiva` sobre la conferencia visible); la política de RLS lo
  vuelve a exigir del lado de Postgres, así que un cliente que mienta no logra
  nada. La comprobación previa existe solo para dar el mensaje con nombre
  propio antes de gastar el viaje.
*/
export function useComparticiones(): ValorDeComparticiones {
  const invitar = useCallback(
    async (
      conferencia: Conferencia | null,
      idInvitado: string,
      puedeCompartir: boolean,
      privacidad: PrivacidadDeComparticion,
    ): Promise<ResultadoDeAccion> => {
      const previo = crearInvitacion(conferencia, idInvitado, puedeCompartir, privacidad)

      if (!previo.ok) {
        return { ok: false, mensaje: mensajeDeError(previo.codigo) }
      }

      /* `conferencia` no es null aquí: `crearInvitacion` ya lo habría rechazado. */
      const conf = conferencia as Conferencia
      const resultado = await crearComparticion(conf.id, conf.idDueno, idInvitado, privacidad)

      return resultado.ok
        ? { ok: true }
        : { ok: false, mensaje: mensajeDeError(resultado.codigo) }
    },
    [],
  )

  return { invitar }
}
