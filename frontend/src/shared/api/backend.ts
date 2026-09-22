import { supabase } from '@/shared/supabase/cliente'
import type { ResultadoDeConsulta } from '@/shared/supabase/consultas'
import { CODIGOS_DE_ERROR } from '@/shared/errors'
import type { CodigoError } from '@/shared/errors'

/*
  Cliente del backend de orquestación de IA (`backend/`).

  El backend es opcional en desarrollo: sin `VITE_API_URL` el chat responde con
  la simulación en el navegador y la carga de una conferencia la deja `en-cola`
  sin procesar. `hayBackend()` es lo que cada dominio consulta para decidir
  entre la ruta real y la simulada — nunca se asume que está.

  El token de sesión se pide a `supabase.auth.getSession()` en cada llamada y
  no se guarda: Supabase ya lo mantiene en memoria y lo rota solo, y una copia
  local se quedaría vieja tras un refresco. El backend exige ese token porque
  consulta Supabase como el usuario, con RLS aplicando igual que en el
  navegador.

  Todo fallo entra al dominio como un `ResultadoDeConsulta` con un código del
  catálogo, nunca como una excepción: un backend caído se ve como un mensaje
  accionable, no como una burbuja de error sin texto.
*/

const URL_BASE = (import.meta.env.VITE_API_URL ?? '').trim().replace(/\/+$/, '')

export function hayBackend(): boolean {
  return URL_BASE.length > 0
}

/*
  Despierta al backend sin esperar respuesta.

  En el plan gratuito de Render el servidor se duerme tras 15 minutos sin
  tráfico y tarda cerca de un minuto en arrancar. Se llama al entrar a la
  app: ese minuto pasa mientras la persona mira sus conferencias, y no
  cuando pulsa "Analizar" o pide un PDF, que es donde se notaría.
*/
export function despertarBackend(): void {
  if (!hayBackend()) {
    return
  }

  void fetch(`${URL_BASE}/salud`).catch(() => {
    /* Si no responde, las acciones que lo necesitan ya saben decirlo. */
  })
}

async function tokenDeSesion(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

export async function pedirAlBackend<T>(
  ruta: string,
  cuerpo: unknown,
): Promise<ResultadoDeConsulta<T>> {
  if (!hayBackend()) {
    return { ok: false, codigo: 'DATOS_FALLO_INESPERADO' }
  }

  const token = await tokenDeSesion()

  if (token === null) {
    return { ok: false, codigo: 'AUTH_FALLO_INESPERADO' }
  }

  let respuesta: Response

  try {
    respuesta = await fetch(`${URL_BASE}${ruta}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(cuerpo),
    })
  } catch {
    /* `fetch` solo lanza por fallo de red: DNS, servidor apagado, CORS. */
    return { ok: false, codigo: 'DATOS_SIN_CONEXION' }
  }

  if (!respuesta.ok) {
    return { ok: false, codigo: await codigoDeRespuestaFallida(respuesta) }
  }

  try {
    return { ok: true, datos: (await respuesta.json()) as T }
  } catch {
    return { ok: false, codigo: 'DATOS_FALLO_INESPERADO' }
  }
}

/*
  Como `pedirAlBackend`, pero con un archivo de ida y otro de vuelta.

  Existe para convertir una memoria a PDF: se manda el `.docx` tal cual, como
  cuerpo crudo, y vuelve el PDF. No se envuelve en JSON ni en base64 —un
  documento con imágenes pesa megas, y codificarlo lo engordaría un tercio
  para nada—, pero los fallos siguen llegando como `{ codigo, mensaje }` y se
  traducen igual que en la otra.
*/
export async function pedirArchivoAlBackend(
  ruta: string,
  archivo: Blob,
): Promise<ResultadoDeConsulta<Blob>> {
  if (!hayBackend()) {
    return { ok: false, codigo: 'DATOS_FALLO_INESPERADO' }
  }

  const token = await tokenDeSesion()

  if (token === null) {
    return { ok: false, codigo: 'AUTH_FALLO_INESPERADO' }
  }

  let respuesta: Response

  try {
    respuesta = await fetch(`${URL_BASE}${ruta}`, {
      method: 'POST',
      headers: {
        'Content-Type': archivo.type || 'application/octet-stream',
        Authorization: `Bearer ${token}`,
      },
      body: archivo,
    })
  } catch {
    return { ok: false, codigo: 'DATOS_SIN_CONEXION' }
  }

  if (!respuesta.ok) {
    return { ok: false, codigo: await codigoDeRespuestaFallida(respuesta) }
  }

  return { ok: true, datos: await respuesta.blob() }
}

/*
  El backend responde `{ codigo, mensaje }` en cada fallo nombrado (ver
  `bitacora/api/aplicacion.py`). Se respeta ese código si es uno que el
  frontend conoce; si no, se traduce el estado HTTP a algo accionable. Un 401
  es sesión vencida, un 403 es permiso, y el resto cae al genérico sin filtrar
  el cuerpo crudo.
*/
async function codigoDeRespuestaFallida(respuesta: Response): Promise<CodigoError> {
  const cuerpo = await respuesta.json().catch(() => null)
  const codigo = typeof cuerpo?.codigo === 'string' ? cuerpo.codigo : ''

  if (esCodigoDelCatalogo(codigo)) {
    return codigo
  }

  if (respuesta.status === 401) return 'AUTH_FALLO_INESPERADO'
  if (respuesta.status === 403) return 'DATOS_SIN_PERMISO'
  if (respuesta.status === 409) return 'DATOS_CONFLICTO'

  return 'DATOS_FALLO_INESPERADO'
}

const CODIGOS_CONOCIDOS = new Set<string>(CODIGOS_DE_ERROR)

/*
  El backend define códigos propios con el prefijo `PROC_` para el
  procesamiento; los que la interfaz sabe traducir son los que ya están en su
  catálogo. Cualquier otro cae al genérico en vez de mostrarse crudo.
*/
function esCodigoDelCatalogo(codigo: string): codigo is CodigoError {
  return CODIGOS_CONOCIDOS.has(codigo)
}
