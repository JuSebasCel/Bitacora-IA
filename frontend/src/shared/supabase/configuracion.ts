/*
  Lectura y validación de la configuración de Supabase, separada de
  `cliente.ts` para poder probarla sin depender de `import.meta.env` real
  (`leerConfiguracionSupabase` recibe el entorno como parámetro).

  Falla rápido con un mensaje claro en vez de dejar que `createClient` de
  Supabase falle más adelante, en el primer intento de red, con un error
  genérico que no dice qué variable falta — mismo criterio que
  `CLAUDE.md` sección 7 pide para configuración de entorno.
*/

export type ConfiguracionSupabase = {
  readonly url: string
  readonly anonKey: string
}

type EntornoSupabase = {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
}

function requerida(entorno: EntornoSupabase, nombre: keyof EntornoSupabase): string {
  const valor = entorno[nombre]

  if (valor === undefined || valor.trim().length === 0) {
    throw new Error(
      `Falta la variable de entorno ${nombre}. Revisa frontend/.env.local (ver frontend/.env.example) o las variables de entorno del despliegue.`,
    )
  }

  return valor
}

export function leerConfiguracionSupabase(entorno: EntornoSupabase): ConfiguracionSupabase {
  return {
    url: requerida(entorno, 'VITE_SUPABASE_URL'),
    anonKey: requerida(entorno, 'VITE_SUPABASE_ANON_KEY'),
  }
}
