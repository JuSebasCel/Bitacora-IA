import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'
import { CUENTAS_DE_EJEMPLO, SessionProvider } from '@/features/auth/session'
import { mensajeDeError } from '@/shared/errors'
import { PantallaRegistro } from './PantallaRegistro'

function DestinoConferencias(): ReactElement {
  return <p>Panel de conferencias</p>
}

function montar(): void {
  render(
    <SessionProvider>
      <MemoryRouter initialEntries={['/registro']}>
        <Routes>
          <Route path="/registro" element={<PantallaRegistro />} />
          <Route path="/conferencias" element={<DestinoConferencias />} />
          <Route path="/acceso" element={<p>Formulario de acceso</p>} />
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

describe('PantallaRegistro', () => {
  it('asocia cada campo con su etiqueta', () => {
    montar()

    expect(screen.getByLabelText('Nombre')).toBeInTheDocument()
    expect(screen.getByLabelText('Correo')).toHaveAttribute('type', 'email')
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('autocomplete', 'new-password')
  })

  it('muestra un placeholder de ejemplo sin reemplazar la etiqueta visible', () => {
    montar()

    expect(screen.getByLabelText('Nombre')).toHaveAttribute('placeholder')
    expect(screen.getByLabelText('Correo')).toHaveAttribute('placeholder')
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('placeholder')
    expect(screen.getByText('Nombre')).toBeInTheDocument()
    expect(screen.getByText('Correo')).toBeInTheDocument()
    expect(screen.getByText('Contraseña')).toBeInTheDocument()
  })

  it('al enviar el formulario vacío muestra un error legible, nunca el código crudo', async () => {
    const usuario = userEvent.setup()
    montar()

    await usuario.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    const alerta = await screen.findByRole('alert')
    expect(alerta).toBeVisible()
    expect(alerta).toHaveTextContent(mensajeDeError('AUTH_CAMPO_REQUERIDO'))
    expect(alerta.textContent ?? '').not.toContain('AUTH_')
  })

  it('con un correo ya registrado muestra el mensaje de correo existente', async () => {
    const usuario = userEvent.setup()
    montar()

    await usuario.type(screen.getByLabelText('Nombre'), 'Otra Persona')
    await usuario.type(screen.getByLabelText('Correo'), primeraCuenta().correo)
    await usuario.type(screen.getByLabelText('Contraseña'), 'Clave-Nueva-2026')
    await usuario.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent(mensajeDeError('AUTH_CORREO_YA_REGISTRADO'))
    expect(alerta.textContent ?? '').not.toContain('AUTH_')
    expect(screen.queryByText('Panel de conferencias')).not.toBeInTheDocument()
  })

  it('con un correo nuevo navega a las conferencias', async () => {
    const usuario = userEvent.setup()
    montar()

    await usuario.type(screen.getByLabelText('Nombre'), 'Mariana Osorio Cifuentes')
    await usuario.type(screen.getByLabelText('Correo'), 'mariana.osorio@labanfora.org')
    await usuario.type(screen.getByLabelText('Contraseña'), 'Clave-Nueva-2026')
    await usuario.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(await screen.findByText('Panel de conferencias')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('enlaza de vuelta al acceso', async () => {
    const usuario = userEvent.setup()
    montar()

    const enlace = screen.getByRole('link', { name: /Acceder/ })
    expect(enlace).toHaveAttribute('href', '/acceso')

    await usuario.click(enlace)
    expect(await screen.findByText('Formulario de acceso')).toBeInTheDocument()
  })
})
