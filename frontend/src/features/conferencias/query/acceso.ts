import type { CodigoError } from '@/shared/errors'
import type { Comparticion, Conferencia, Ficha, PrivacidadDeComparticion } from '../data'

/*
  Quién puede ver qué.

  Es la simulación en frontend de la regla de aislamiento por fila que el
  producto exige (PRD.md sección 9, PLAN.md sección 6.3). Vive en funciones
  puras y no dentro de un componente a propósito: el aislamiento no puede
  depender de que la interfaz decida no dibujar algo.

  Cuando entre B1 estas reglas se mudan a políticas de acceso por fila en
  Postgres. Este archivo desaparece, pero sus pruebas describen el
  comportamiento que esas políticas tienen que reproducir.
*/

export type Procedencia = 'propia' | 'compartida'

export type ConferenciaVisible = {
  readonly conferencia: Conferencia
  readonly procedencia: Procedencia
  /** La compartición que da el acceso. Es null cuando la conferencia es propia. */
  readonly comparticion: Comparticion | null
}

export type ResultadoConferencia =
  | { readonly ok: true; readonly visible: ConferenciaVisible }
  | { readonly ok: false; readonly codigo: CodigoError }

/* Sobre lo propio no hay nada que restringir: el dueño lo ve todo. */
const PRIVACIDAD_SIN_RESTRICCIONES: PrivacidadDeComparticion = {
  compartirEtiquetas: true,
  compartirFichasPendientes: true,
  permitirValidarFichas: true,
  permitirRecompartir: true,
}

function visibilidadDe(conferencia: Conferencia, idUsuario: string): ConferenciaVisible | null {
  if (conferencia.idDueno === idUsuario) {
    return { conferencia, procedencia: 'propia', comparticion: null }
  }

  const comparticion = conferencia.comparticiones.find(
    (candidata) => candidata.idInvitado === idUsuario,
  )

  if (comparticion === undefined) {
    return null
  }

  /*
    Una invitacion sin contestar no es una conferencia del archivo.

    Postgres deja ver la fila —hace falta para poder decidir si se acepta—
    pero no sus fichas. Si se colara aqui, apareceria en el explorador como
    una charla vacia y sin explicacion. Su sitio es la bandeja de
    invitaciones, no el archivo.
  */
  if (comparticion.estado !== 'aceptada') {
    return null
  }

  return { conferencia, procedencia: 'compartida', comparticion }
}

/*
  Invitaciones dirigidas a esta persona y todavia sin contestar.

  Sale de las mismas conferencias que ya trae el listado: la fila viaja con sus
  comparticiones embebidas, asi que no hace falta una segunda consulta.
*/
export function invitacionesPendientes(
  todas: readonly Conferencia[],
  idUsuario: string,
): readonly Conferencia[] {
  return todas.filter(
    (conferencia) =>
      conferencia.idDueno !== idUsuario &&
      conferencia.comparticiones.some(
        (c) => c.idInvitado === idUsuario && c.estado === 'pendiente',
      ),
  )
}

/*
  Respuestas a lo que YO comparti y que todavia no he visto.

  El aviso se deriva de la propia fila en vez de una tabla de notificaciones:
  el unico dato que hace falta —quien contesto y que dijo— ya esta ahi, y una
  tabla aparte habria que mantenerla en sincronia sin que nadie gane nada.
*/
export type RespuestaAUnaInvitacion = {
  readonly conferencia: Conferencia
  readonly idInvitado: string
  /** Quien contesto, con el nombre copiado al invitar. Cae al correo si no tenia nombre. */
  readonly quien: string
  readonly aceptada: boolean
}

export function respuestasSinVer(
  todas: readonly Conferencia[],
  idUsuario: string,
  yaVistas: (idConferencia: string, idInvitado: string) => boolean,
): readonly RespuestaAUnaInvitacion[] {
  const respuestas: RespuestaAUnaInvitacion[] = []

  for (const conferencia of todas) {
    if (conferencia.idDueno !== idUsuario) {
      continue
    }

    for (const comparticion of conferencia.comparticiones) {
      if (comparticion.estado === 'pendiente') {
        continue
      }

      if (comparticion.respuestaVista === true || yaVistas(conferencia.id, comparticion.idInvitado)) {
        continue
      }

      respuestas.push({
        conferencia,
        idInvitado: comparticion.idInvitado,
        quien:
          comparticion.invitadoNombre !== ''
            ? comparticion.invitadoNombre
            : comparticion.invitadoCorreo !== ''
              ? comparticion.invitadoCorreo
              : 'Alguien',
        aceptada: comparticion.estado === 'aceptada',
      })
    }
  }

  return respuestas
}

/** Lo que una persona puede ver: lo suyo, más lo que le compartieron, y nada más. */
export function conferenciasVisibles(
  todas: readonly Conferencia[],
  idUsuario: string,
): readonly ConferenciaVisible[] {
  const visibles: ConferenciaVisible[] = []

  for (const conferencia of todas) {
    const visible = visibilidadDe(conferencia, idUsuario)

    if (visible !== null) {
      visibles.push(visible)
    }
  }

  return visibles
}

/*
  Devuelve el mismo CONF_NO_ENCONTRADA para una conferencia que no existe y
  para una que existe pero no es visible. La indistinguibilidad es deliberada:
  si los dos casos se diferenciaran, bastaría con probar identificadores contra
  el detalle para averiguar qué ha subido otra persona.
*/
export function obtenerConferencia(
  todas: readonly Conferencia[],
  idUsuario: string,
  idConferencia: string,
): ResultadoConferencia {
  const conferencia = todas.find((candidata) => candidata.id === idConferencia)

  if (conferencia === undefined) {
    return { ok: false, codigo: 'CONF_NO_ENCONTRADA' }
  }

  const visible = visibilidadDe(conferencia, idUsuario)

  if (visible === null) {
    return { ok: false, codigo: 'CONF_NO_ENCONTRADA' }
  }

  return { ok: true, visible }
}

/** Las restricciones que aplican de verdad sobre una conferencia, ya sea propia o compartida. */
export function privacidadEfectiva(visible: ConferenciaVisible): PrivacidadDeComparticion {
  if (visible.comparticion === null) {
    return PRIVACIDAD_SIN_RESTRICCIONES
  }

  return visible.comparticion.privacidad
}

/*
  Las fichas de una conferencia, filtradas por lo que la compartición permite.
  Lo que la opción de privacidad excluye no se entrega: no se entrega y se
  esconde en la interfaz.
*/
export function fichasVisibles(
  todas: readonly Ficha[],
  visible: ConferenciaVisible,
): readonly Ficha[] {
  const privacidad = privacidadEfectiva(visible)

  return todas.filter((ficha) => {
    if (ficha.idConferencia !== visible.conferencia.id) {
      return false
    }

    if (!privacidad.compartirFichasPendientes && ficha.estadoDeValidacion === 'pendiente') {
      return false
    }

    return true
  })
}

/** Una ficha del catálogo (F6), junto con la conferencia de la que viene. */
export type FichaDelCatalogo = {
  readonly ficha: Ficha
  readonly conferencia: Conferencia
}

/*
  Base del catálogo: las fichas de TODAS las conferencias visibles para esa
  persona, no solo una. No es una regla de acceso nueva — reusa
  `fichasVisibles` por cada conferencia visible, así que hereda su misma
  cobertura de privacidad (fichas pendientes ocultas cuando la compartición
  no las incluye) sin duplicarla.
*/
export function fichasDelCatalogo(
  todas: readonly Ficha[],
  visibles: readonly ConferenciaVisible[],
): readonly FichaDelCatalogo[] {
  return visibles.flatMap((visible) =>
    fichasVisibles(todas, visible).map((ficha) => ({ ficha, conferencia: visible.conferencia })),
  )
}
