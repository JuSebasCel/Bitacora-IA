import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'
import { CUENTAS_DE_EJEMPLO, SessionProvider } from '@/features/auth/session'
import { mensajeDeError } from '@/shared/errors'
import { PantallaAcceso } from './PantallaAcceso'

/*
  El destino real de /conferencias lo cablea el integrador del router. Aquí se
  monta un doble mínimo para poder afirmar que la navegación ocurrió sin
  depender de otro módulo.
*/
function DestinoConferencias(): ReactElement {
  return <p>Panel de conferencias</p>
}

function montar(): void {
  render(
    <SessionProvider>
      <MemoryRouter initialEntries={['/acceso']}>
        <Routes>
          <Route path="/acceso" element={<PantallaAcceso />} />
          <Route path="/conferencias" element={<DestinoConferencias />} />
          <Route path="/registro" element={<p>Formulario de registro</p>} />
        </Routes>
      </MemoryRouter>
    </SessionProvider>,
  )
}

function primeraCuenta() {
  const cuenta = CUENTAS_DE_EJEMPLO[0]
  if (cuenta === undefined) {
    throw new Error('El fixture de cuentas de ejemplo no puede estar vacío')
  }
  return cuenta
}

describe('PantallaAcceso', () => {
  it('asocia cada campo con su etiqueta', () => {
    montar()

    expect(screen.getByLabelText('Correo')).toHaveAttribute('type', 'email')
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('type', 'password')
  })

  it('muestra un placeholder de ejemplo sin reemplazar la etiqueta visible', () => {
    montar()

    expect(screen.getByLabelText('Correo')).toHaveAttribute('placeholder')
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('placeholder')
    expect(screen.getByText('Correo')).toBeInTheDocument()
    expect(screen.getByText('Contraseña')).toBeInTheDocument()
  })

  it('al enviar el formulario vacío muestra un error legible, nunca el código crudo', async () => {
    const usuario = userEvent.setup()
    montar()

    await usuario.click(screen.getByRole('button', { name: 'Acceder' }))

    const alerta = await screen.findByRole('alert')
    expect(alerta).toBeVisible()
    expect(alerta).toHaveTextContent(mensajeDeError('AUTH_CAMPO_REQUERIDO'))
    expect(alerta.textContent ?? '').not.toContain('AUTH_')
  })

  it('con credenciales incorrectas muestra el mensaje traducido de credenciales inválidas', async () => {
    const usuario = userEvent.setup()
    montar()

    await usuario.type(screen.getByLabelText('Correo'), primeraCuenta().correo)
    await usuario.type(screen.getByLabelText('Contraseña'), 'contrasena-que-no-es')
    await usuario.click(screen.getByRole('button', { name: 'Acceder' }))

    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent(mensajeDeError('AUTH_CREDENCIALES_INVALIDAS'))
    expect(alerta.textContent ?? '').not.toContain('AUTH_')
    expect(screen.queryByText('Panel de conferencias')).not.toBeInTheDocument()
  })

  it('con credenciales válidas navega a las conferencias y no deja error en pantalla', async () => {
    const usuario = userEvent.setup()
    const cuenta = primeraCuenta()
    montar()

    await usuario.type(screen.getByLabelText('Correo'), cuenta.correo)
    await usuario.type(screen.getByLabelText('Contraseña'), cuenta.contrasena)
    await usuario.click(screen.getByRole('button', { name: 'Acceder' }))

    expect(await screen.findByText('Panel de conferencias')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('el error se muestra al enviar, no antes de intentarlo', async () => {
    const usuario = userEvent.setup()
    montar()

    await usuario.type(screen.getByLabelText('Correo'), 'quien@ejemplo.org')
    await usuario.clear(screen.getByLabelText('Correo'))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('mientras el envío está pendiente el botón queda deshabilitado', async () => {
    montar()

    const boton = screen.getByRole('button', { name: 'Acceder' })
    expect(boton).toHaveProperty('type', 'submit')

    fireEvent.click(boton)

    expect(boton).toBeDisabled()
    expect(boton).toHaveAttribute('aria-busy', 'true')

    await waitFor(() => {
      expect(boton).toBeEnabled()
    })
  })

  it('enlaza al registro para quien no tiene cuenta', async () => {
    const usuario = userEvent.setup()
    montar()

    const enlace = screen.getByRole('link', { name: /Crear cuenta/ })
    expect(enlace).toHaveAttribute('href', '/registro')

    await usuario.click(enlace)
    expect(await screen.findByText('Formulario de registro')).toBeInTheDocument()
  })
})
