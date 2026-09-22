import { hayBackend, pedirAlBackend } from '@/shared/api/backend'
import type { ResultadoDeConsulta } from '@/shared/supabase/consultas'
import type { MarcadorDeDocx, MarcadorSimpleDeDocx } from './data'
import { nombreDeMarcador } from './plantillas'

/*
  Pedirle a la IA qué debe escribirse en cada campo de la plantilla.

  Configurar quince campos a mano es donde se abandona una plantilla, y el
  documento ya trae casi todo: cómo se llama el campo y qué hay escrito a su
  alrededor. Esto los manda al backend (`POST /plantillas/instrucciones`) y
  devuelve la configuración propuesta.

  **No pisa lo ya escrito.** Solo se ofrece rellenar los campos que están sin
  instrucción: quien configuró uno a mano tenía una razón.
*/

export type CampoPropuesto = {
  readonly id: string
  readonly instruccion: string
  readonly formato: MarcadorSimpleDeDocx['formato']
  readonly modo: NonNullable<MarcadorSimpleDeDocx['modo']>
  readonly extension: NonNullable<MarcadorSimpleDeDocx['extension']>
}

export function camposSinInstruccion(marcadores: readonly MarcadorDeDocx[]): readonly MarcadorSimpleDeDocx[] {
  return marcadores.filter(
    (marcador): marcador is MarcadorSimpleDeDocx =>
      marcador.tipo === 'simple' && (marcador.instruccion ?? '').trim() === '',
  )
}

export function sePuedenProponerInstrucciones(marcadores: readonly MarcadorDeDocx[]): boolean {
  return hayBackend() && camposSinInstruccion(marcadores).length > 0
}

export async function proponerInstrucciones(
  nombreDePlantilla: string,
  marcadores: readonly MarcadorDeDocx[],
): Promise<ResultadoDeConsulta<readonly CampoPropuesto[]>> {
  const campos = camposSinInstruccion(marcadores).map((marcador) => ({
    id: marcador.id,
    nombre: nombreDeMarcador(marcador.textoOriginal),
    contexto: marcador.contexto,
  }))

  const resultado = await pedirAlBackend<{ campos: readonly CampoPropuesto[] }>(
    '/plantillas/instrucciones',
    { nombre: nombreDePlantilla, campos },
  )

  return resultado.ok ? { ok: true, datos: resultado.datos.campos } : resultado
}

/** Aplica lo propuesto sobre los marcadores, sin tocar los que ya tenían instrucción. */
export function conInstruccionesPropuestas(
  marcadores: readonly MarcadorDeDocx[],
  propuestas: readonly CampoPropuesto[],
): readonly MarcadorDeDocx[] {
  const porId = new Map(propuestas.map((propuesta) => [propuesta.id, propuesta]))

  return marcadores.map((marcador) => {
    const propuesta = marcador.tipo === 'simple' ? porId.get(marcador.id) : undefined

    if (propuesta === undefined || marcador.tipo !== 'simple' || (marcador.instruccion ?? '').trim() !== '') {
      return marcador
    }

    return {
      ...marcador,
      instruccion: propuesta.instruccion,
      formato: propuesta.formato,
      modo: propuesta.modo,
      extension: propuesta.extension,
    }
  })
}
