import { createClient } from '@supabase/supabase-js'
import { leerConfiguracionSupabase } from './configuracion'

/*
  Único punto de creación del cliente de Supabase. Todo lo demás (dominios de
  auth, y los que se conecten en B2-B9) importa `supabase` de aquí, nunca
  llama `createClient` por su cuenta.
*/
const configuracion = leerConfiguracionSupabase(import.meta.env)

export const supabase = createClient(configuracion.url, configuracion.anonKey)
