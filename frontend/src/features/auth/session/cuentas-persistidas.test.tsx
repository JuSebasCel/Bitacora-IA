import type { ReactNode } from 'react'
import { act, renderHook } from '@testing-library/react'
import { expect, test } from 'vitest'
import { CLAVE_CUENTAS } from './almacenamiento'
import { SessionProvider } from './SessionProvider'
import { useSession } from './useSession'

/*
  Una cuenta creada durante el uso vivía solo en memoria mientras la sesión sí
  sobrevivía al recargado. El resultado era que registrarse, recargar y cerrar
  sesión dejaba la cuenta inaccesible para siempre.

  Desmontar y volver a montar el provider es exactamente lo que hace un
  recargado de página: el estado en memoria se pierde y solo queda
  sessionStorage.
*/

const CUENTA = {
  nombre: 'Ana Lucía Restrepo Ossa',
  correo: 'ana.restrepo@labanfora.org',
  contrasena: 'Coloquio-Sur-2026',
}

function envoltura({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>
}

function montar() {
  return renderHook(() => useSession(), { wrapper: envoltura })
}

test('una cuenta registrada sigue sirviendo después de recargar', async () => {
  const antes = montar()

  await act(async () => {
    const resultado = await antes.result.current.registrar(
      CUENTA.nombre,
      CUENTA.correo,
      CUENTA.contrasena,
    )
    expect(resultado.ok).toBe(true)
  })

  antes.unmount()

  const despues = montar()
  expect(despues.result.current.autenticado).toBe(true)

  act(() => {
    despues.result.current.cerrarSesion()
  })
  expect(despues.result.current.autenticado).toBe(false)

  await act(async () => {
    const resultado = await despues.result.current.acceder(CUENTA.correo, CUENTA.contrasena)
    expect(resultado.ok).toBe(true)
  })

  expect(despues.result.current.autenticado).toBe(true)
  expect(despues.result.current.usuario?.correo).toBe(CUENTA.correo)
})

test('la contraseña de una cuenta registrada nunca se persiste', async () => {
  const { result } = montar()

  await act(async () => {
    await result.current.registrar(CUENTA.nombre, CUENTA.correo, CUENTA.contrasena)
  })

  const crudo = sessionStorage.getItem(CLAVE_CUENTAS)

  expect(crudo).not.toBeNull()
  expect(crudo).toContain(CUENTA.correo)
  expect(crudo).not.toContain(CUENTA.contrasena)
})

test('una contraseña equivocada no abre la cuenta registrada tras recargar', async () => {
  const antes = montar()

  await act(async () => {
    await antes.result.current.registrar(CUENTA.nombre, CUENTA.correo, CUENTA.contrasena)
  })
  antes.unmount()

  const despues = montar()
  act(() => {
    despues.result.current.cerrarSesion()
  })

  await act(async () => {
    const resultado = await despues.result.current.acceder(CUENTA.correo, 'otra-clave-distinta')
    expect(resultado).toEqual({ ok: false, codigo: 'AUTH_CREDENCIALES_INVALIDAS' })
  })

  expect(despues.result.current.autenticado).toBe(false)
})

test('un correo mal formado se nombra como tal, no como credenciales inválidas', async () => {
  const { result } = montar()

  await act(async () => {
    const alAcceder = await result.current.acceder('valentina.alcantara@', 'Anfora-2026')
    expect(alAcceder).toEqual({ ok: false, codigo: 'AUTH_CORREO_INVALIDO' })
  })

  await act(async () => {
    const alRegistrar = await result.current.registrar('Valentina', 'valentina', 'Anfora-2026')
    expect(alRegistrar).toEqual({ ok: false, codigo: 'AUTH_CORREO_INVALIDO' })
  })

  expect(result.current.autenticado).toBe(false)
})

/*
  Las cuentas guardadas se leen de forma diferida, la primera vez que hacen
  falta, no al montar. Lo que importa es que un valor corrupto no reviente ese
  primer uso y quede limpio después.
*/
test('un valor corrupto en las cuentas guardadas no rompe el acceso', async () => {
  sessionStorage.setItem(CLAVE_CUENTAS, '{no es json')

  const { result } = montar()
  expect(result.current.autenticado).toBe(false)

  await act(async () => {
    const resultado = await result.current.acceder(CUENTA.correo, CUENTA.contrasena)
    expect(resultado).toEqual({ ok: false, codigo: 'AUTH_CREDENCIALES_INVALIDAS' })
  })

  expect(sessionStorage.getItem(CLAVE_CUENTAS)).toBeNull()

  /* Y una cuenta del fixture sigue entrando con normalidad. */
  await act(async () => {
    const resultado = await result.current.acceder(
      'valentina.alcantara@labanfora.org',
      'Anfora-2026',
    )
    expect(resultado.ok).toBe(true)
  })
})
