import { supabase } from '@/shared/supabase/cliente'
import { resultadoDe, resultadoDeLista } from '@/shared/supabase/consultas'
import type { ResultadoDeConsulta } from '@/shared/supabase/consultas'

/*
  Preferencia privada de vista: qué conferencias sacó cada quien de su propio
  listado. No es una regla de acceso —la conferencia sigue siendo accesible
  por su URL—, así que `obtenerConferencia` nunca consulta esto. La política
  «cada quien administra sus conferencias ocultas» acota la tabla a lo de
  `auth.uid()`, y por eso ninguna consulta de aquí filtra por usuario a mano.
*/

type FilaOculta = { readonly id_conferencia: string }

export async function listarOcultas(): Promise<ResultadoDeConsulta<readonly string[]>> {
  const respuesta = await supabase.from('conferencias_ocultas').select('id_conferencia')
  const lista = resultadoDeLista(respuesta as { data: FilaOculta[] | null; error: null })

  return lista.ok ? { ok: true, datos: lista.datos.map((fila) => fila.id_conferencia) } : lista
}

export async function ocultarRemota(
  idUsuario: string,
  idConferencia: string,
): Promise<ResultadoDeConsulta<null>> {
  const { error } = await supabase
    .from('conferencias_ocultas')
    .upsert({ id_usuario: idUsuario, id_conferencia: idConferencia })

  return error === null
    ? { ok: true, datos: null }
    : resultadoDe({ data: null, error }, () => ({ ok: false, codigo: 'DATOS_FALLO_INESPERADO' }))
}

export async function mostrarRemota(idConferencia: string): Promise<ResultadoDeConsulta<null>> {
  const { error } = await supabase
    .from('conferencias_ocultas')
    .delete()
    .eq('id_conferencia', idConferencia)

  return error === null
    ? { ok: true, datos: null }
    : resultadoDe({ data: null, error }, () => ({ ok: false, codigo: 'DATOS_FALLO_INESPERADO' }))
}
