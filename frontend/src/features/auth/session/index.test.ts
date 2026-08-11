import { describe, expect, it } from 'vitest'
import * as barril from './index'

/*
  El barril es contrato público del módulo: otros módulos del shell importan
  desde '@/features/auth/session'. Esta prueba falla si alguien renombra o
  deja de reexportar una de las piezas acordadas.
*/
describe('barril de la sesión', () => {
  it('reexporta el provider, el hook y el fixture', () => {
    expect(typeof barril.SessionProvider).toBe('function')
    expect(typeof barril.useSession).toBe('function')
    expect(Array.isArray(barril.CUENTAS_DE_EJEMPLO)).toBe(true)
  })
})
