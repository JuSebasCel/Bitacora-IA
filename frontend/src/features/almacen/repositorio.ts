import { supabase } from '@/shared/supabase/cliente'
import type { ResultadoDeConsulta } from '@/shared/supabase/consultas'

/*
  Los archivos de cada conferencia, tal como están en el almacenamiento.

  No hay una tabla de archivos: el bucket `audio-conferencias` ya guarda todo
  lo de una charla en su carpeta (`<id_dueno>/<id_conferencia>/`), y listarla
  es la fuente de verdad. Ahí viven el archivo que se subió (audio o texto) y
  la transcripción que guarda el análisis (`transcripcion-guardada.json`).
  La RLS del almacenamiento decide qué carpetas se pueden leer: las propias y
  las de las conferencias compartidas y aceptadas.
*/

const BUCKET = 'audio-conferencias'
const TRANSCRIPCION_GUARDADA = 'transcripcion-guardada.json'
const VIGENCIA_DE_LA_FIRMA_S = 60 * 60

export type TipoDeArchivo = 'audio' | 'texto' | 'docx' | 'pdf' | 'transcripcion-automatica' | 'otro'

export type ArchivoDelAlmacen = {
  readonly nombre: string
  readonly ruta: string
  readonly tipo: TipoDeArchivo
  readonly bytes: number
}

function tipoDe(nombre: string): TipoDeArchivo {
  const minusculas = nombre.toLowerCase()

  if (minusculas === TRANSCRIPCION_GUARDADA) return 'transcripcion-automatica'
  if (/\.(mp3|wav|m4a|aac|ogg|webm)$/.test(minusculas)) return 'audio'
  if (/\.(txt|md|vtt|srt)$/.test(minusculas)) return 'texto'
  if (minusculas.endsWith('.docx')) return 'docx'
  if (minusculas.endsWith('.pdf')) return 'pdf'
  return 'otro'
}

export async function listarArchivos(
  idDueno: string,
  idConferencia: string,
): Promise<ResultadoDeConsulta<readonly ArchivoDelAlmacen[]>> {
  const carpeta = `${idDueno}/${idConferencia}`
  const { data, error } = await supabase.storage.from(BUCKET).list(carpeta)

  if (error !== null || data === null) {
    return { ok: false, codigo: 'DATOS_SIN_PERMISO' }
  }

  return {
    ok: true,
    datos: data
      .filter((objeto) => objeto.name !== '.emptyFolderPlaceholder')
      .map((objeto) => ({
        nombre: objeto.name,
        ruta: `${carpeta}/${objeto.name}`,
        tipo: tipoDe(objeto.name),
        bytes: Number((objeto.metadata as { size?: number } | null)?.size ?? 0),
      })),
  }
}

/** Una dirección temporal para reproducir o abrir el archivo sin descargarlo entero antes. */
export async function direccionDe(ruta: string): Promise<string | null> {
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(ruta, VIGENCIA_DE_LA_FIRMA_S)
  return data?.signedUrl ?? null
}

export async function descargar(ruta: string): Promise<Blob | null> {
  const { data } = await supabase.storage.from(BUCKET).download(ruta)
  return data ?? null
}
