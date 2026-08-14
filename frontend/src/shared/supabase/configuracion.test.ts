import { describe, expect, it } from 'vitest'
import { leerConfiguracionSupabase } from './configuracion'

describe('leerConfiguracionSupabase', () => {
  it('devuelve la url y la anon key cuando las dos variables están presentes', () => {
    const configuracion = leerConfiguracionSupabase({
      VITE_SUPABASE_URL: 'https://proyecto.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'clave-publica',
    })

    expect(configuracion).toEqual({ url: 'https://proyecto.supabase.co', anonKey: 'clave-publica' })
  })

  it('falla rápido si falta VITE_SUPABASE_URL', () => {
    expect(() =>
      leerConfiguracionSupabase({ VITE_SUPABASE_ANON_KEY: 'clave-publica' }),
    ).toThrow(/VITE_SUPABASE_URL/)
  })

  it('falla rápido si falta VITE_SUPABASE_ANON_KEY', () => {
    expect(() =>
      leerConfiguracionSupabase({ VITE_SUPABASE_URL: 'https://proyecto.supabase.co' }),
    ).toThrow(/VITE_SUPABASE_ANON_KEY/)
  })

  it('trata una cadena vacía como si faltara la variable', () => {
    expect(() =>
      leerConfiguracionSupabase({ VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' }),
    ).toThrow(/VITE_SUPABASE_URL/)
  })
})
