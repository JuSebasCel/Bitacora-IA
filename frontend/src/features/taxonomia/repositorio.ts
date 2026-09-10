import { supabase } from '@/shared/supabase/cliente'
import { resultadoDeLista } from '@/shared/supabase/consultas'
import type { ResultadoDeConsulta } from '@/shared/supabase/consultas'
import type { Taxonomia, Tema, TemaActivoEnEvento, TemaPropuesto } from './data/tipos'

/*
  Único punto del dominio de taxonomía que habla con Supabase.

  El pool de temas es vocabulario del grupo, no una preferencia de nadie: RLS
  lo deja leer a cualquier autenticado y escribir solo por las operaciones de
  curaduría. `useTaxonomia`/`useTemas` dependen de estas funciones y nunca de
  `supabase.from(...)`.

  Aprobar una propuesta son tres escrituras (insertar el tema, activarlo en su
  evento, borrar la propuesta) que aquí no comparten transacción. El orden
  importa: primero el tema, luego lo que lo referencia, y la propuesta al
  final — así una caída a mitad deja la propuesta viva para reintentar, nunca
  un tema activo apuntando a una fila que no existe.
*/

type FilaTema = { readonly id: string; readonly nombre: string }
type FilaActivo = { readonly id_evento: string; readonly id_tema: string }
type FilaPropuesta = {
  readonly id: string
  readonly nombre: string
  readonly id_evento: string
  readonly justificacion: string
  readonly propuesto_el: string
}

function mapearTema(fila: FilaTema): Tema {
  return { id: fila.id, nombre: fila.nombre }
}

function mapearActivo(fila: FilaActivo): TemaActivoEnEvento {
  return { idEvento: fila.id_evento, idTema: fila.id_tema }
}

function mapearPropuesta(fila: FilaPropuesta): TemaPropuesto {
  return {
    id: fila.id,
    nombre: fila.nombre,
    idEvento: fila.id_evento,
    justificacion: fila.justificacion,
    propuestoEl: fila.propuesto_el,
  }
}

/** Carga la taxonomía completa: pool, activos por evento y propuestas pendientes. */
export async function leerTaxonomiaRemota(): Promise<ResultadoDeConsulta<Taxonomia>> {
  const [temas, activos, propuestas] = await Promise.all([
    supabase.from('temas').select('id, nombre').order('nombre', { ascending: true }),
    supabase.from('temas_activos_evento').select('id_evento, id_tema'),
    supabase.from('temas_propuestos').select('id, nombre, id_evento, justificacion, propuesto_el'),
  ])

  const temasOk = resultadoDeLista(temas as { data: FilaTema[] | null; error: null })
  if (!temasOk.ok) return temasOk

  const activosOk = resultadoDeLista(activos as { data: FilaActivo[] | null; error: null })
  if (!activosOk.ok) return activosOk

  const propuestasOk = resultadoDeLista(propuestas as { data: FilaPropuesta[] | null; error: null })
  if (!propuestasOk.ok) return propuestasOk

  return {
    ok: true,
    datos: {
      temas: temasOk.datos.map(mapearTema),
      activos: activosOk.datos.map(mapearActivo),
      propuestas: propuestasOk.datos.map(mapearPropuesta),
    },
  }
}

/*
  Aprueba una propuesta: el nombre entra al pool y queda activo en el evento
  que lo propuso. Devuelve la taxonomía ya recargada, para que el hook la use
  tal cual sin una segunda lectura.
*/
export async function aprobarPropuestaRemota(
  propuesta: TemaPropuesto,
): Promise<ResultadoDeConsulta<Taxonomia>> {
  const inserido = await supabase
    .from('temas')
    .insert({ nombre: propuesta.nombre.trim() })
    .select('id, nombre')
    .single()

  if (inserido.error !== null) {
    return resultadoDeLista({ data: null, error: inserido.error }) as ResultadoDeConsulta<Taxonomia>
  }

  const idTema = (inserido.data as FilaTema).id

  const activado = await supabase
    .from('temas_activos_evento')
    .insert({ id_evento: propuesta.idEvento, id_tema: idTema })

  if (activado.error !== null) {
    return resultadoDeLista({ data: null, error: activado.error }) as ResultadoDeConsulta<Taxonomia>
  }

  await supabase.from('temas_propuestos').delete().eq('id', propuesta.id)

  return leerTaxonomiaRemota()
}

/** Rechaza una propuesta: se borra sin tocar el pool. */
export async function rechazarPropuestaRemota(
  idPropuesta: string,
): Promise<ResultadoDeConsulta<Taxonomia>> {
  const { error } = await supabase.from('temas_propuestos').delete().eq('id', idPropuesta)

  if (error !== null) {
    return resultadoDeLista({ data: null, error }) as ResultadoDeConsulta<Taxonomia>
  }

  return leerTaxonomiaRemota()
}
