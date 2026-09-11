import { supabase } from '@/shared/supabase/cliente'
import { codigoDeErrorDeSupabase, resultadoDeLista } from '@/shared/supabase/consultas'
import type { ResultadoDeConsulta } from '@/shared/supabase/consultas'
import type { Memoria } from './data'

/*
  Único punto del dominio de memorias que habla con Supabase (B6). Mismo
  contrato que `plantillas/repositorio.ts`: funciones asíncronas planas que
  devuelven `ResultadoDeConsulta`, y ninguna pantalla toca `supabase.from`.

  Lo que se guarda sigue siendo la referencia liviana y nunca el documento
  generado: `id_conferencia` + `id_plantilla` + nombre. La tabla no tiene
  dónde poner un `.docx` congelado y eso es deliberado (PLAN.md 1.3) -- la
  memoria se vuelve a generar al abrirla, así que refleja siempre las fichas
  validadas de hoy y no las del día en que se pulsó "Generar". Si el documento
  se guardara, una ficha corregida dejaría a la memoria mintiendo en silencio.

  Sin `update`: una memoria no se edita después de generarse. Solo se crea, se
  lista y se elimina.
*/

const TABLA = 'memorias'

/** Forma de una fila de `memorias` tal como la devuelve PostgREST (columnas en snake_case). */
type FilaDeMemoria = {
  readonly id: string
  readonly id_conferencia: string
  readonly id_plantilla: string
  readonly id_dueno: string
  readonly nombre: string
  readonly generada_el: string
}

function memoriaDesdeFila(fila: FilaDeMemoria): Memoria {
  return {
    id: fila.id,
    idConferencia: fila.id_conferencia,
    idPlantilla: fila.id_plantilla,
    idDueno: fila.id_dueno,
    nombre: fila.nombre,
    generadaEl: fila.generada_el,
  }
}

function filaDesdeMemoria(memoria: Memoria): Record<string, unknown> {
  return {
    id: memoria.id,
    id_conferencia: memoria.idConferencia,
    id_plantilla: memoria.idPlantilla,
    id_dueno: memoria.idDueno,
    nombre: memoria.nombre,
    generada_el: memoria.generadaEl,
  }
}

/** De la más reciente a la más antigua. RLS ya acota a las memorias de quien pregunta (B11). */
export async function listarMemorias(): Promise<ResultadoDeConsulta<readonly Memoria[]>> {
  const respuesta = await supabase.from(TABLA).select('*').order('generada_el', { ascending: false })

  const resultado = resultadoDeLista<FilaDeMemoria>(respuesta)

  return resultado.ok ? { ok: true, datos: resultado.datos.map(memoriaDesdeFila) } : resultado
}

/*
  Un fallo de llave foránea aquí (la conferencia o la plantilla elegida ya no
  existen) llega traducido como `DATOS_SIN_PERMISO` por la capa compartida, que
  es el desenlace correcto de cara a quien lo ve: la fila referenciada no está
  a su alcance, y distinguir "no existe" de "no es tuya" convertiría el panel
  en una forma de averiguar qué cargó otra persona.
*/
export async function crearMemoria(memoria: Memoria): Promise<ResultadoDeConsulta<Memoria>> {
  const { error } = await supabase.from(TABLA).insert(filaDesdeMemoria(memoria))

  return error === null ? { ok: true, datos: memoria } : { ok: false, codigo: codigoDeErrorDeSupabase(error) }
}

export async function eliminarMemoria(id: string): Promise<ResultadoDeConsulta<null>> {
  const { error } = await supabase.from(TABLA).delete().eq('id', id)

  return error === null ? { ok: true, datos: null } : { ok: false, codigo: codigoDeErrorDeSupabase(error) }
}
