import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { CLAVE_SESION } from './almacenamiento'
import { CUENTAS_DE_EJEMPLO, type CuentaDeEjemplo } from './cuentas.fixture'
import { SessionProvider } from './SessionProvider'
import { useSession } from './useSession'

function cuentaDePrueba(): CuentaDeEjemplo {
  const cuenta = CUENTAS_DE_EJEMPLO[0]
  if (cuenta === undefined) {
    throw new Error('El fixture de cuentas de ejemplo no puede estar vacío')
  }
  return cuenta
}

function envoltura({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>
}

function montarSesion() {
  return renderHook(() => useSession(), { wrapper: envoltura })
}

describe('SessionProvider y useSession', () => {
  it('arranca sin sesión', () => {
    const { result } = montarSesion()

    expect(result.current.usuario).toBeNull()
    expect(result.current.autenticado).toBe(false)
  })

  it('abre la sesión con credenciales válidas', async () => {
    const cuenta = cuentaDePrueba()
    const { result } = montarSesion()

    await act(async () => {
      const resultado = await result.current.acceder(cuenta.correo, cuenta.contrasena)
      expect(resultado.ok).toBe(true)
      if (resultado.ok) {
        expect(resultado.usuario.correo).toBe(cuenta.correo)
        expect(resultado.usuario.nombre).toBe(cuenta.nombre)
        expect(resultado.usuario.id).toBe(cuenta.id)
      }
    })

    expect(result.current.autenticado).toBe(true)
    expect(result.current.usuario?.correo).toBe(cuenta.correo)
  })

  it('tolera mayúsculas y espacios alrededor del correo al acceder', async () => {
    const cuenta = cuentaDePrueba()
    const { result } = montarSesion()

    await act(async () => {
      const resultado = await result.current.acceder(
        `  ${cuenta.correo.toUpperCase()}  `,
        cuenta.contrasena,
      )
      expect(resultado.ok).toBe(true)
    })

    expect(result.current.usuario?.correo).toBe(cuenta.correo)
  })

  it('no abre la sesión con credenciales inválidas', async () => {
    const cuenta = cuentaDePrueba()
    const { result } = montarSesion()

    await act(async () => {
      const resultado = await result.current.acceder(cuenta.correo, 'contrasena-que-no-es')
      expect(resultado).toEqual({ ok: false, codigo: 'AUTH_CREDENCIALES_INVALIDAS' })
    })

    expect(result.current.usuario).toBeNull()
    expect(result.current.autenticado).toBe(false)
    expect(sessionStorage.getItem(CLAVE_SESION)).toBeNull()
  })

  it('no abre la sesión con un correo que no existe', async () => {
    const { result } = montarSesion()

    await act(async () => {
      const resultado = await result.current.acceder('nadie.aqui@labanfora.org', 'Cualquiera123*')
      expect(resultado).toEqual({ ok: false, codigo: 'AUTH_CREDENCIALES_INVALIDAS' })
    })

    expect(result.current.autenticado).toBe(false)
  })

  it('exige los campos obligatorios al acceder', async () => {
    const cuenta = cuentaDePrueba()
    const { result } = montarSesion()

    await act(async () => {
      expect(await result.current.acceder('   ', cuenta.contrasena)).toEqual({
        ok: false,
        codigo: 'AUTH_CAMPO_REQUERIDO',
      })
      expect(await result.current.acceder(cuenta.correo, '   ')).toEqual({
        ok: false,
        codigo: 'AUTH_CAMPO_REQUERIDO',
      })
    })

    expect(result.current.autenticado).toBe(false)
  })

  it('exige los campos obligatorios al registrar', async () => {
    const { result } = montarSesion()

    await act(async () => {
      expect(await result.current.registrar('', 'lucia.moreno@labanfora.org', 'Clave123*')).toEqual(
        {
          ok: false,
          codigo: 'AUTH_CAMPO_REQUERIDO',
        },
      )
      expect(await result.current.registrar('Lucía Moreno', '  ', 'Clave123*')).toEqual({
        ok: false,
        codigo: 'AUTH_CAMPO_REQUERIDO',
      })
      expect(
        await result.current.registrar('Lucía Moreno', 'lucia.moreno@labanfora.org', ''),
      ).toEqual({ ok: false, codigo: 'AUTH_CAMPO_REQUERIDO' })
    })

    expect(result.current.autenticado).toBe(false)
  })

  it('rechaza el registro cuando el correo ya existe', async () => {
    const cuenta = cuentaDePrueba()
    const { result } = montarSesion()

    await act(async () => {
      const resultado = await result.current.registrar(
        'Otra Persona Distinta',
        cuenta.correo.toUpperCase(),
        'ClaveNueva123*',
      )
      expect(resultado).toEqual({ ok: false, codigo: 'AUTH_CORREO_YA_REGISTRADO' })
    })

    expect(result.current.autenticado).toBe(false)
  })

  it('registra un correo nuevo y abre la sesión', async () => {
    const { result } = montarSesion()

    await act(async () => {
      const resultado = await result.current.registrar(
        '  Lucía Moreno Tejada  ',
        '  Lucia.Moreno@labanfora.org ',
        'ClaveNueva123*',
      )
      expect(resultado.ok).toBe(true)
      if (resultado.ok) {
        expect(resultado.usuario.nombre).toBe('Lucía Moreno Tejada')
        expect(resultado.usuario.correo).toBe('lucia.moreno@labanfora.org')
        expect(resultado.usuario.id.length).toBeGreaterThan(0)
      }
    })

    expect(result.current.autenticado).toBe(true)
  })

  it('permite acceder con una cuenta recién registrada', async () => {
    const { result } = montarSesion()

    await act(async () => {
      await result.current.registrar('Tomás Iriarte Vega', 'tomas.iriarte@labanfora.org', 'Clave1*')
    })
    act(() => {
      result.current.cerrarSesion()
    })
    await act(async () => {
      const resultado = await result.current.acceder('tomas.iriarte@labanfora.org', 'Clave1*')
      expect(resultado.ok).toBe(true)
    })

    expect(result.current.autenticado).toBe(true)
  })

  it('cierra la sesión y limpia el almacenamiento', async () => {
    const cuenta = cuentaDePrueba()
    const { result } = montarSesion()

    await act(async () => {
      await result.current.acceder(cuenta.correo, cuenta.contrasena)
    })
    expect(sessionStorage.getItem(CLAVE_SESION)).not.toBeNull()

    act(() => {
      result.current.cerrarSesion()
    })

    expect(result.current.usuario).toBeNull()
    expect(result.current.autenticado).toBe(false)
    expect(sessionStorage.getItem(CLAVE_SESION)).toBeNull()
  })

  it('rehidrata la sesión guardada al montar el provider', () => {
    sessionStorage.setItem(
      CLAVE_SESION,
      JSON.stringify({
        id: 'usr-rehidratado',
        nombre: 'Esteban Quiroga Lamas',
        correo: 'esteban.quiroga@labanfora.org',
      }),
    )

    const { result } = montarSesion()

    expect(result.current.autenticado).toBe(true)
    expect(result.current.usuario).toEqual({
      id: 'usr-rehidratado',
      nombre: 'Esteban Quiroga Lamas',
      correo: 'esteban.quiroga@labanfora.org',
    })
  })

  it('nunca persiste la contraseña en sessionStorage', async () => {
    const cuenta = cuentaDePrueba()
    const { result } = montarSesion()

    await act(async () => {
      await result.current.acceder(cuenta.correo, cuenta.contrasena)
    })

    const crudo = sessionStorage.getItem(CLAVE_SESION)
    expect(crudo).not.toBeNull()
    expect(crudo).not.toContain(cuenta.contrasena)
    expect(crudo?.toLowerCase()).not.toContain('contrasena')
    expect(crudo?.toLowerCase()).not.toContain('password')
  })

  it('tampoco persiste la contraseña de una cuenta recién registrada', async () => {
    const { result } = montarSesion()

    await act(async () => {
      await result.current.registrar(
        'Ana Sofía Peralta',
        'ana.peralta@labanfora.org',
        'SecretoDeAna88*',
      )
    })

    const crudo = sessionStorage.getItem(CLAVE_SESION)
    expect(crudo).not.toContain('SecretoDeAna88*')
  })

  it('no devuelve la contraseña dentro del usuario de la sesión', async () => {
    const cuenta = cuentaDePrueba()
    const { result } = montarSesion()

    await act(async () => {
      await result.current.acceder(cuenta.correo, cuenta.contrasena)
    })

    expect(Object.keys(result.current.usuario ?? {}).sort()).toEqual(['correo', 'id', 'nombre'])
  })

  it('no escribe la contraseña en la consola', async () => {
    const cuenta = cuentaDePrueba()
    const espiaLog = vi.spyOn(console, 'log').mockImplementation(() => {})
    const espiaError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const espiaWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { result } = montarSesion()

    await act(async () => {
      await result.current.acceder(cuenta.correo, cuenta.contrasena)
      await result.current.acceder(cuenta.correo, 'clave-equivocada')
    })

    const escrito = [espiaLog, espiaError, espiaWarn]
      .flatMap((espia) => espia.mock.calls)
      .flat()
      .map((argumento) => String(argumento))
      .join(' ')
    expect(escrito).not.toContain(cuenta.contrasena)
    expect(escrito).not.toContain('clave-equivocada')

    espiaLog.mockRestore()
    espiaError.mockRestore()
    espiaWarn.mockRestore()
  })

  it('arranca sin sesión cuando el almacenamiento tiene un valor no parseable', () => {
    sessionStorage.setItem(CLAVE_SESION, 'esto-no-es-json{{{')

    const { result } = montarSesion()

    expect(result.current.usuario).toBeNull()
    expect(result.current.autenticado).toBe(false)
  })

  it('arranca sin sesión cuando el almacenamiento tiene una forma inesperada', () => {
    sessionStorage.setItem(CLAVE_SESION, JSON.stringify({ id: 7, apodo: 'sin nombre' }))

    const { result } = montarSesion()

    expect(result.current.usuario).toBeNull()
    expect(result.current.autenticado).toBe(false)
  })

  it('descarta el valor corrupto del almacenamiento al montar', () => {
    sessionStorage.setItem(CLAVE_SESION, 'esto-no-es-json{{{')

    montarSesion()

    expect(sessionStorage.getItem(CLAVE_SESION)).toBeNull()
  })

  it('lanza un error claro si useSession se usa fuera del provider', () => {
    const espia = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => renderHook(() => useSession())).toThrowError(/SessionProvider/)

    espia.mockRestore()
  })
})
