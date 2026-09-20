import { supabase } from '@/shared/supabase/cliente'
import { resultadoDe, resultadoDeLista } from '@/shared/supabase/consultas'
import type { ResultadoDeConsulta } from '@/shared/supabase/consultas'
import type { Evento, Ponente } from '../data'

/*
  Directorio compartido de eventos y ponentes contra Supabase.

  Es del grupo, no de una persona: la política «cualquier autenticado
  administra eventos/ponentes» deja a todos leer y crear. No hay `id_dueno`
  ni filtro por usuario.

  El id lo genera Postgres (uuid), no el cliente: por eso `crearEventoRemoto`
  devuelve la fila insertada, para que quien la creó pueda seleccionarla al
  instante sin adivinar su id.
*/

type FilaEvento = { readonly id: string; readonly nombre: string }
type FilaPonente = { readonly id: string; readonly nombre: string; readonly id_evento: string }

function mapearPonente(fila: FilaPonente): Ponente {
  return { id: fila.id, nombre: fila.nombre, idEvento: fila.id_evento }
}

export async function listarDirectorio(): Promise<
  ResultadoDeConsulta<{ readonly eventos: readonly Evento[]; readonly ponentes: readonly Ponente[] }>
> {
  const [eventos, ponentes] = await Promise.all([
    supabase.from('eventos').select('id, nombre').order('nombre', { ascending: true }),
    supabase.from('ponentes').select('id, nombre, id_evento').order('nombre', { ascending: true }),
  ])

  const eventosOk = resultadoDeLista(eventos as { data: FilaEvento[] | null; error: null })
  if (!eventosOk.ok) return eventosOk

  const ponentesOk = resultadoDeLista(ponentes as { data: FilaPonente[] | null; error: null })
  if (!ponentesOk.ok) return ponentesOk

  return {
    ok: true,
    datos: { eventos: eventosOk.datos, ponentes: ponentesOk.datos.map(mapearPonente) },
  }
}

export async function crearEventoRemoto(nombre: string): Promise<ResultadoDeConsulta<Evento>> {
  const respuesta = await supabase
    .from('eventos')
    .insert({ nombre: nombre.trim() })
    .select('id, nombre')
    .single()

  return resultadoDe(respuesta as { data: FilaEvento | null; error: null }, () => ({
    ok: false,
    codigo: 'DIR_EVENTO_NOMBRE_REQUERIDO',
  }))
}

export async function crearPonenteRemoto(
  idEvento: string,
  nombre: string,
): Promise<ResultadoDeConsulta<Ponente>> {
  const respuesta = await supabase
    .from('ponentes')
    .insert({ nombre: nombre.trim(), id_evento: idEvento })
    .select('id, nombre, id_evento')
    .single()

  const fila = resultadoDe(respuesta as { data: FilaPonente | null; error: null }, () => ({
    ok: false,
    codigo: 'DIR_PONENTE_NOMBRE_REQUERIDO',
  }))

  return fila.ok ? { ok: true, datos: mapearPonente(fila.datos) } : fila
}

/*
  Renombrar un evento cambia tambien el de sus conferencias.

  `conferencias.evento` guarda el NOMBRE como texto denormalizado, no una clave
  foranea: asi lo decidio la migracion, porque el directorio es una fuente de
  sugerencias y no una relacion estricta. La consecuencia es que renombrar solo
  la fila de `eventos` dejaria el directorio diciendo una cosa y el archivo
  otra: las charlas ya cargadas seguirian agrupadas bajo el nombre viejo, y
  apareceria un evento fantasma en la columna que nadie podria renombrar.

  Son dos escrituras sin transaccion. El orden importa: primero las
  conferencias y luego el directorio. Al reves, un fallo a mitad dejaria el
  directorio renombrado y las charlas huerfanas bajo un nombre que ya no
  existe; en este orden, un fallo deja el directorio como estaba y reintentar
  arregla el desfase.
*/
export async function renombrarEventoRemoto(
  idEvento: string,
  nombreAnterior: string,
  nombre: string,
): Promise<ResultadoDeConsulta<null>> {
  const limpio = nombre.trim()

  const enConferencias = await supabase
    .from('conferencias')
    .update({ evento: limpio })
    .eq('evento', nombreAnterior)

  if (enConferencias.error !== null) {
    return resultadoDe({ data: null, error: enConferencias.error }, () => ({
      ok: false,
      codigo: 'DATOS_SIN_PERMISO',
    }))
  }

  const { error } = await supabase.from('eventos').update({ nombre: limpio }).eq('id', idEvento)

  return error === null
    ? { ok: true, datos: null }
    : resultadoDe({ data: null, error }, () => ({ ok: false, codigo: 'DIR_EVENTO_YA_EXISTE' }))
}

/** Mismo criterio que el evento: `conferencias.ponente` tambien es texto denormalizado. */
export async function renombrarPonenteRemoto(
  idPonente: string,
  nombreAnterior: string,
  nombre: string,
): Promise<ResultadoDeConsulta<null>> {
  const limpio = nombre.trim()

  const enConferencias = await supabase
    .from('conferencias')
    .update({ ponente: limpio })
    .eq('ponente', nombreAnterior)

  if (enConferencias.error !== null) {
    return resultadoDe({ data: null, error: enConferencias.error }, () => ({
      ok: false,
      codigo: 'DATOS_SIN_PERMISO',
    }))
  }

  const { error } = await supabase
    .from('ponentes')
    .update({ nombre: limpio })
    .eq('id', idPonente)

  return error === null
    ? { ok: true, datos: null }
    : resultadoDe({ data: null, error }, () => ({ ok: false, codigo: 'DIR_PONENTE_YA_EXISTE' }))
}

/*
  Borra un evento del directorio, y con él sus ponentes (`on delete cascade`).

  **No toca ninguna conferencia.** `conferencias.evento` es el nombre como
  texto denormalizado, no una clave foránea: así lo decidió la migración
  —el directorio es una fuente de sugerencias, no una relación estricta—.
  Quitar un evento de aquí retira la sugerencia para futuras cargas; las
  charlas ya cargadas conservan el nombre con el que se guardaron.

  Es importante decirlo en la confirmación: alguien que borra "Biotecnología"
  esperando que desaparezcan sus charlas se llevaría una sorpresa al revés.
*/
export async function eliminarEventoRemoto(idEvento: string): Promise<ResultadoDeConsulta<null>> {
  const { error } = await supabase.from('eventos').delete().eq('id', idEvento)

  return error === null
    ? { ok: true, datos: null }
    : resultadoDe({ data: null, error }, () => ({ ok: false, codigo: 'DATOS_SIN_PERMISO' }))
}

export async function eliminarPonenteRemoto(idPonente: string): Promise<ResultadoDeConsulta<null>> {
  const { error } = await supabase.from('ponentes').delete().eq('id', idPonente)

  return error === null
    ? { ok: true, datos: null }
    : resultadoDe({ data: null, error }, () => ({ ok: false, codigo: 'DATOS_SIN_PERMISO' }))
}
