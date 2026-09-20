import { supabase } from '@/shared/supabase/cliente'
import { resultadoDe, resultadoDeLista } from '@/shared/supabase/consultas'
import type { ResultadoDeConsulta } from '@/shared/supabase/consultas'
import type { Comparticion, PrivacidadDeComparticion } from '@/features/conferencias/data'
import { mapearComparticion } from '@/features/conferencias/repositorio'
import type { FilaDeComparticion } from '@/features/conferencias/repositorio'

/*
  Único punto del dominio de compartición que habla con Supabase.

  El aislamiento lo garantiza RLS: la política «el dueño administra sus
  comparticiones» solo deja insertar una fila cuya `id_dueno` sea `auth.uid()`,
  así que aunque el cliente mande otra, Postgres la rechaza. `id_dueno` viaja
  denormalizado desde `conferencias.id_dueno` porque las políticas de fichas y
  etiquetas lo leen sin una subconsulta extra por fila (ver la migración).
*/

/** Persona del grupo que puede recibir una conferencia compartida. */
export type PerfilDelGrupo = {
  readonly id: string
  readonly nombre: string
  readonly correo: string
}

type FilaDePerfil = { readonly id: string; readonly nombre: string; readonly correo: string }

/** Todos los perfiles del grupo, para elegir con quién compartir. RLS deja leerlos a cualquier autenticado. */
export async function listarPerfiles(): Promise<ResultadoDeConsulta<readonly PerfilDelGrupo[]>> {
  const respuesta = await supabase
    .from('profiles')
    .select('id, nombre, correo')
    .order('nombre', { ascending: true })

  return resultadoDeLista(respuesta as { data: FilaDePerfil[] | null; error: null })
}

/*
  Envía una invitación. La restricción `unique (id_conferencia, id_invitado)`
  de la tabla es la que atrapa de verdad el doble envío: si dos pestañas
  comparten a la vez, una gana y la otra recibe `DATOS_CONFLICTO`, que la
  interfaz traduce a «esa persona ya tiene esta conferencia».
*/
export async function crearComparticion(
  idConferencia: string,
  idDueno: string,
  invitado: CuentaInvitable,
  privacidad: PrivacidadDeComparticion,
): Promise<ResultadoDeConsulta<Comparticion>> {
  const respuesta = await supabase
    .from('comparticiones')
    .insert({
      id_conferencia: idConferencia,
      id_dueno: idDueno,
      id_invitado: invitado.id,
      /* Copia para poder nombrar a quien responde sin abrir `profiles`. */
      invitado_nombre: invitado.nombre,
      invitado_correo: invitado.correo,
      privacidad,
    })
    .select('id_invitado, compartida_el, privacidad, estado, respondida_el, invitado_nombre, invitado_correo')
    .single()

  const fila = resultadoDe(respuesta as { data: FilaDeComparticion | null; error: null }, () => ({
    ok: false,
    codigo: 'CONFIG_CONFERENCIA_REQUERIDA',
  }))

  return fila.ok ? { ok: true, datos: mapearComparticion(fila.datos) } : fila
}

/** Retira una compartición: el invitado deja de ver la conferencia (RLS lo resuelve en la siguiente consulta). */
export async function eliminarComparticion(
  idConferencia: string,
  idInvitado: string,
): Promise<ResultadoDeConsulta<null>> {
  const { error } = await supabase
    .from('comparticiones')
    .delete()
    .eq('id_conferencia', idConferencia)
    .eq('id_invitado', idInvitado)

  return error === null
    ? { ok: true, datos: null }
    : resultadoDe({ data: null, error }, () => ({ ok: false, codigo: 'DATOS_FALLO_INESPERADO' }))
}

/*
  Busca una cuenta por su correo exacto.

  Va por RPC y no por `select` sobre `profiles`: esa tabla no es legible entre
  usuarios y no debe serlo, porque listarla convierte cualquier cuenta en un
  directorio de todos los correos del sistema. La función devuelve el id y
  nada más — ni nombre, ni si hay alguno parecido.

  `null` significa que no hay cuenta con ese correo. Es información que quien
  invita necesita —no puede invitar a quien no existe— y no revela nada que no
  supiera ya: está preguntando por un correo concreto que él mismo escribió.
*/
export type CuentaInvitable = {
  readonly id: string
  readonly nombre: string
  readonly correo: string
}

export async function buscarCuentaPorCorreo(
  correo: string,
): Promise<ResultadoDeConsulta<CuentaInvitable | null>> {
  const { data, error } = await supabase.rpc('buscar_cuenta_por_correo', {
    correo_buscado: correo.trim(),
  })

  if (error !== null) {
    return resultadoDe({ data: null, error }, () => ({ ok: false, codigo: 'DATOS_FALLO_INESPERADO' }))
  }

  /* La funcion devuelve una tabla: cero filas si no hay cuenta con ese correo. */
  const fila = Array.isArray(data) ? data[0] : null

  if (fila === null || fila === undefined) {
    return { ok: true, datos: null }
  }

  return {
    ok: true,
    datos: {
      id: String(fila.id),
      nombre: String(fila.nombre ?? ''),
      correo: String(fila.correo ?? ''),
    },
  }
}

/*
  El invitado contesta. Solo escribe el estado y su fecha: RLS le deja tocar
  la fila entera —no sabe acotar columnas— así que es aquí donde se sostiene
  que no pueda cambiarse la privacidad que le concedieron.
*/
export async function responderComparticion(
  idConferencia: string,
  idInvitado: string,
  estado: 'aceptada' | 'rechazada',
): Promise<ResultadoDeConsulta<null>> {
  const { error } = await supabase
    .from('comparticiones')
    .update({
      estado,
      respondida_el: new Date().toISOString(),
      respuesta_vista_por_dueno: false,
    })
    .eq('id_conferencia', idConferencia)
    .eq('id_invitado', idInvitado)

  return error === null
    ? { ok: true, datos: null }
    : resultadoDe({ data: null, error }, () => ({ ok: false, codigo: 'DATOS_SIN_PERMISO' }))
}

/** El dueño marca como visto el aviso de que le contestaron, para que deje de aparecer. */
export async function marcarRespuestaVista(
  idConferencia: string,
  idInvitado: string,
): Promise<ResultadoDeConsulta<null>> {
  const { error } = await supabase
    .from('comparticiones')
    .update({ respuesta_vista_por_dueno: true })
    .eq('id_conferencia', idConferencia)
    .eq('id_invitado', idInvitado)

  return error === null
    ? { ok: true, datos: null }
    : resultadoDe({ data: null, error }, () => ({ ok: false, codigo: 'DATOS_SIN_PERMISO' }))
}
