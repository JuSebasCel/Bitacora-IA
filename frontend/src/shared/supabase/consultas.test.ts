import type { PostgrestError } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { codigoDeErrorDeSupabase, resultadoDe, resultadoDeLista } from './consultas'

function errorDe(code: string, message = 'algo falló'): PostgrestError {
  return { code, message, details: '', hint: '' } as PostgrestError
}

describe('codigoDeErrorDeSupabase', () => {
  it('traduce una violación de unicidad a conflicto', () => {
    expect(codigoDeErrorDeSupabase(errorDe('23505'))).toBe('DATOS_CONFLICTO')
  })

  it('traduce un rechazo de RLS a falta de permiso', () => {
    expect(codigoDeErrorDeSupabase(errorDe('42501'))).toBe('DATOS_SIN_PERMISO')
    expect(codigoDeErrorDeSupabase(errorDe('PGRST301'))).toBe('DATOS_SIN_PERMISO')
  })

  it('traduce una llave foránea rota a falta de permiso, no a fallo genérico', () => {
    expect(codigoDeErrorDeSupabase(errorDe('23503'))).toBe('DATOS_SIN_PERMISO')
  })

  it('reconoce un fallo de red, que llega sin código', () => {
    expect(codigoDeErrorDeSupabase(errorDe('', 'TypeError: Failed to fetch'))).toBe(
      'DATOS_SIN_CONEXION',
    )
  })

  /*
    Un código real siempre gana sobre la heurística de red: sin este orden, un
    error de Postgres cuyo mensaje mencionara la palabra "network" se
    reportaría como si la persona estuviera sin conexión.
  */
  it('un código conocido gana sobre el mensaje', () => {
    expect(codigoDeErrorDeSupabase(errorDe('23505', 'network hiccup'))).toBe('DATOS_CONFLICTO')
  })

  it('cualquier otro fallo cae al genérico, sin filtrar el código crudo', () => {
    expect(codigoDeErrorDeSupabase(errorDe('22P02', 'invalid input syntax for type uuid'))).toBe(
      'DATOS_FALLO_INESPERADO',
    )
  })
})

describe('resultadoDe', () => {
  it('devuelve los datos cuando la consulta trae fila', () => {
    expect(resultadoDe({ data: { id: 'a' }, error: null }, () => ({ ok: false, codigo: 'CONF_NO_ENCONTRADA' }))).toEqual(
      { ok: true, datos: { id: 'a' } },
    )
  })

  it('sin fila y sin error, delega en el código que decida el dominio', () => {
    expect(resultadoDe({ data: null, error: null }, () => ({ ok: false, codigo: 'CONF_NO_ENCONTRADA' }))).toEqual({
      ok: false,
      codigo: 'CONF_NO_ENCONTRADA',
    })
  })

  it('con error, nunca llega a consultar el caso vacío', () => {
    expect(
      resultadoDe({ data: null, error: errorDe('23505') }, () => ({ ok: false, codigo: 'CONF_NO_ENCONTRADA' })),
    ).toEqual({ ok: false, codigo: 'DATOS_CONFLICTO' })
  })
})

describe('resultadoDeLista', () => {
  it('sin filas es una lista vacía, no un fallo', () => {
    expect(resultadoDeLista({ data: null, error: null })).toEqual({ ok: true, datos: [] })
  })

  it('propaga el fallo traducido', () => {
    expect(resultadoDeLista({ data: null, error: errorDe('42501') })).toEqual({
      ok: false,
      codigo: 'DATOS_SIN_PERMISO',
    })
  })
})
