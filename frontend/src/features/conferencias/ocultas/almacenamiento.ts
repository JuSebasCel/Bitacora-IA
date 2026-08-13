import { escribirJson, leerJson } from '@/shared/storage/almacenamiento'

/*
  Conferencias que cada persona quitó de su propio listado.

  Mismo patrón que las etiquetas personales: un espacio por usuario, para que
  sea imposible leer lo de otro por olvidar un filtro. Es una preferencia de
  vista, no una regla de acceso — ocultar una conferencia no le quita la
  visibilidad real (`query/acceso.ts`), solo la saca del listado de quien la
  ocultó. Por eso `obtenerConferencia` no consulta este archivo: entrar
  directo por la URL sigue funcionando.

  Todo lo que no pasa los guards se descarta en silencio, igual que en
  `tags/almacenamiento.ts`.
*/

export const CLAVE_OCULTAS = 'bitacora-ai.conferencias-ocultas'

function esListaDeIds(valor: unknown): valor is readonly string[] {
  return (
    Array.isArray(valor) &&
    valor.every((elemento) => typeof elemento === 'string' && elemento.trim().length > 0)
  )
}

function leerMapaGuardado(): Readonly<Record<string, readonly string[]>> {
  const valor = leerJson(CLAVE_OCULTAS)

  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) {
    return {}
  }

  const mapa: Record<string, readonly string[]> = {}

  for (const [idUsuario, crudo] of Object.entries(valor as Record<string, unknown>)) {
    if (esListaDeIds(crudo)) {
      mapa[idUsuario] = crudo
    }
  }

  return mapa
}

export function idsOcultosDe(idUsuario: string): readonly string[] {
  return leerMapaGuardado()[idUsuario] ?? []
}

export function ocultarConferencia(idUsuario: string, idConferencia: string): readonly string[] {
  const actuales = idsOcultosDe(idUsuario)
  const nuevos = actuales.includes(idConferencia) ? actuales : [...actuales, idConferencia]

  escribirJson(CLAVE_OCULTAS, { ...leerMapaGuardado(), [idUsuario]: nuevos })

  return nuevos
}

/*
  El inverso de `ocultarConferencia`. Sin él, quitar una conferencia del
  listado era irreversible desde la interfaz (solo se recuperaba entrando por
  la URL directa, que nadie tiene por qué adivinar), y encima ocurría sin
  confirmación: un clic accidental en el ojo tachado no tenía vuelta atrás.
*/
export function mostrarConferencia(idUsuario: string, idConferencia: string): readonly string[] {
  const nuevos = idsOcultosDe(idUsuario).filter((id) => id !== idConferencia)

  escribirJson(CLAVE_OCULTAS, { ...leerMapaGuardado(), [idUsuario]: nuevos })

  return nuevos
}
