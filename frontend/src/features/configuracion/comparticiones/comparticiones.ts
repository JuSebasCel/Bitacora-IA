import type { Comparticion, Conferencia, PrivacidadDeComparticion } from '@/features/conferencias/data'
import type { CodigoError } from '@/shared/errors'

/*
  Reglas puras de "enviar invitación": nunca lanza, nunca muta lo que recibe,
  el fallo viaja como código de error, igual que `taxonomia.ts`/`etiquetas.ts`.

  El permiso para compartir (`puedeCompartir`) llega ya resuelto desde afuera
  y no se recalcula aquí: decidir si quien invita es el dueño o un invitado
  con `permitirRecompartir` necesita la capa de acceso completa
  (`privacidadEfectiva`, `conferenciasVisibles`), y este archivo no depende de
  ella a propósito — la misma separación que ya usa `taxonomia.ts` con
  "ids en uso" para no eliminar un tema.
*/

export type ResultadoDeInvitacion =
  | { readonly ok: true; readonly comparticion: Comparticion }
  | { readonly ok: false; readonly codigo: CodigoError }

export function crearInvitacion(
  conferencia: Conferencia | null,
  idInvitado: string,
  puedeCompartir: boolean,
  privacidad: PrivacidadDeComparticion,
): ResultadoDeInvitacion {
  if (conferencia === null) {
    return { ok: false, codigo: 'CONFIG_CONFERENCIA_REQUERIDA' }
  }

  if (idInvitado.trim().length === 0) {
    return { ok: false, codigo: 'CONFIG_INVITADO_REQUERIDO' }
  }

  if (!puedeCompartir) {
    return { ok: false, codigo: 'CONFIG_SIN_PERMISO_PARA_COMPARTIR' }
  }

  const yaCompartida = conferencia.comparticiones.some((comparticion) => comparticion.idInvitado === idInvitado)
  if (yaCompartida) {
    return { ok: false, codigo: 'CONFIG_YA_COMPARTIDA' }
  }

  return {
    ok: true,
    /* Nace pendiente: compartir es invitar, no dar acceso. */
    comparticion: {
      idInvitado,
      estado: 'pendiente',
      respondidaEl: null,
      invitadoNombre: '',
      invitadoCorreo: '',
      compartidaEl: new Date().toISOString(),
      privacidad,
    },
  }
}
