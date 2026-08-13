import { escribirJson, leerJson } from '@/shared/storage/almacenamiento'

/*
  API key propia, por usuario. Mismo aviso de seguridad que ya tiene
  `auth/session/cuentas.fixture.ts`: texto plano en `sessionStorage` es
  aceptable SOLO porque no hay backend real todavía y nada consume esta
  clave para llamar a OpenAI de verdad. Cuando entre B2 (gestión real de API
  keys, cifrada en reposo), este archivo se borra junto con el campo — no se
  adapta ni se reutiliza, `CLAUDE.md` sección 4 prohíbe cualquier credencial
  en el bundle del frontend.

  Nunca se imprime en ningún log ni mensaje de error: `mensajeDeError` no
  interpola valores del usuario en sus mensajes, y aquí tampoco se hace.
*/

export const CLAVE_CONFIGURACION = 'bitacora-ai.configuracion'

function leerMapaGuardado(): Readonly<Record<string, string>> {
  const valor = leerJson(CLAVE_CONFIGURACION)

  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) {
    return {}
  }

  const mapa: Record<string, string> = {}

  for (const [idUsuario, crudo] of Object.entries(valor as Record<string, unknown>)) {
    if (typeof crudo === 'string' && crudo.trim().length > 0) {
      mapa[idUsuario] = crudo
    }
  }

  return mapa
}

export function leerApiKey(idUsuario: string): string | null {
  return leerMapaGuardado()[idUsuario] ?? null
}

export function guardarApiKey(idUsuario: string, clave: string): void {
  escribirJson(CLAVE_CONFIGURACION, { ...leerMapaGuardado(), [idUsuario]: clave })
}
