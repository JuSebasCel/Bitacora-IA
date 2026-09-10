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
  idInvitado: string,
  privacidad: PrivacidadDeComparticion,
): Promise<ResultadoDeConsulta<Comparticion>> {
  const respuesta = await supabase
    .from('comparticiones')
    .insert({
      id_conferencia: idConferencia,
      id_dueno: idDueno,
      id_invitado: idInvitado,
      privacidad,
    })
    .select('id_invitado, compartida_el, privacidad')
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
