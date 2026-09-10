import { supabase } from '@/shared/supabase/cliente'
import { resultadoDe, resultadoDeLista } from '@/shared/supabase/consultas'
import type { ResultadoDeConsulta } from '@/shared/supabase/consultas'
import type { AsignacionDeEtiqueta, EspacioDeEtiquetas, Etiqueta } from '../data'
import type { EtiquetaVisible } from './etiquetas'

/*
  Único punto del dominio de etiquetas personales que habla con Supabase.

  El aislamiento es de RLS: la política «el dueño administra sus propias
  etiquetas» solo deja a cada quien ver y tocar las suyas. Ver las de otra
  persona sobre una conferencia compartida no pasa por leer su espacio —eso
  RLS lo prohíbe— sino por la función `mis_etiquetas_visibles`, que ya
  aplica la comprobación de `compartirEtiquetas` (ver la migración B10).
*/

type FilaEtiqueta = { readonly id: string; readonly nombre: string; readonly id_propietario: string }
type FilaAsignacion = { readonly id_etiqueta: string; readonly id_conferencia: string }
type FilaVisible = {
  readonly id_conferencia: string
  readonly id_etiqueta: string
  readonly nombre: string
  readonly propia: boolean
}

function mapearEtiqueta(fila: FilaEtiqueta): Etiqueta {
  return { id: fila.id, nombre: fila.nombre, idPropietario: fila.id_propietario }
}

function mapearAsignacion(fila: FilaAsignacion): AsignacionDeEtiqueta {
  return { idEtiqueta: fila.id_etiqueta, idConferencia: fila.id_conferencia }
}

/** El espacio propio de quien tiene la sesión: sus etiquetas y a qué conferencias las puso. */
export async function leerMiEspacio(): Promise<ResultadoDeConsulta<EspacioDeEtiquetas>> {
  const [etiquetas, asignaciones] = await Promise.all([
    supabase.from('etiquetas').select('id, nombre, id_propietario').order('nombre', { ascending: true }),
    supabase.from('etiquetas_asignaciones').select('id_etiqueta, id_conferencia'),
  ])

  const etiquetasOk = resultadoDeLista(etiquetas as { data: FilaEtiqueta[] | null; error: null })
  if (!etiquetasOk.ok) return etiquetasOk

  const asignacionesOk = resultadoDeLista(
    asignaciones as { data: FilaAsignacion[] | null; error: null },
  )
  if (!asignacionesOk.ok) return asignacionesOk

  /*
    Solo las asignaciones de etiquetas propias: la consulta de
    `etiquetas_asignaciones` puede traer también las de conferencias
    compartidas (política del invitado), y esas no son parte del espacio
    propio — se ven por `mis_etiquetas_visibles`, no aquí.
  */
  const idsPropias = new Set(etiquetasOk.datos.map((fila) => fila.id))

  return {
    ok: true,
    datos: {
      etiquetas: etiquetasOk.datos.map(mapearEtiqueta),
      asignaciones: asignacionesOk.datos
        .filter((fila) => idsPropias.has(fila.id_etiqueta))
        .map(mapearAsignacion),
    },
  }
}

/*
  Las etiquetas visibles sobre cada conferencia, en una sola llamada, ya con
  la marca `propia`. Se devuelve como mapa para que el dashboard resuelva la
  fila de cada conferencia con un acceso directo.
*/
export async function leerEtiquetasVisiblesPorConferencia(): Promise<
  ResultadoDeConsulta<ReadonlyMap<string, readonly EtiquetaVisible[]>>
> {
  const respuesta = await supabase.rpc('mis_etiquetas_visibles')
  const lista = resultadoDeLista(respuesta as { data: FilaVisible[] | null; error: null })

  if (!lista.ok) return lista

  const mapa = new Map<string, EtiquetaVisible[]>()

  for (const fila of lista.datos) {
    const visibles = mapa.get(fila.id_conferencia) ?? []
    visibles.push({
      etiqueta: { id: fila.id_etiqueta, nombre: fila.nombre, idPropietario: '' },
      propia: fila.propia,
    })
    mapa.set(fila.id_conferencia, visibles)
  }

  return { ok: true, datos: mapa }
}

export async function crearEtiquetaRemota(
  nombre: string,
  idPropietario: string,
): Promise<ResultadoDeConsulta<Etiqueta>> {
  const respuesta = await supabase
    .from('etiquetas')
    .insert({ nombre: nombre.trim(), id_propietario: idPropietario })
    .select('id, nombre, id_propietario')
    .single()

  const fila = resultadoDe(respuesta as { data: FilaEtiqueta | null; error: null }, () => ({
    ok: false,
    codigo: 'ETQ_NOMBRE_REQUERIDO',
  }))

  return fila.ok ? { ok: true, datos: mapearEtiqueta(fila.datos) } : fila
}

export async function asignarEtiquetaRemota(
  idEtiqueta: string,
  idConferencia: string,
): Promise<ResultadoDeConsulta<null>> {
  const { error } = await supabase
    .from('etiquetas_asignaciones')
    .upsert({ id_etiqueta: idEtiqueta, id_conferencia: idConferencia })

  return error === null
    ? { ok: true, datos: null }
    : resultadoDe({ data: null, error }, () => ({ ok: false, codigo: 'ETQ_NO_EDITABLE' }))
}

export async function quitarAsignacionRemota(
  idEtiqueta: string,
  idConferencia: string,
): Promise<ResultadoDeConsulta<null>> {
  const { error } = await supabase
    .from('etiquetas_asignaciones')
    .delete()
    .eq('id_etiqueta', idEtiqueta)
    .eq('id_conferencia', idConferencia)

  return error === null
    ? { ok: true, datos: null }
    : resultadoDe({ data: null, error }, () => ({ ok: false, codigo: 'ETQ_NO_EDITABLE' }))
}
