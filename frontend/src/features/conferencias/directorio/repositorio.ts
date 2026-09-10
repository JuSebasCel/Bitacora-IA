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
