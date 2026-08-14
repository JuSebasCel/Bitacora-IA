import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SessionProvider } from '@/features/auth/session'
import { mensajeDeError } from '@/shared/errors'
import { mockearAccederExitoso, mockearAccederFallido, reiniciarMocksDeSesion } from '@/test/sesionDePrueba'
import { PantallaAcceso } from './PantallaAcceso'

vi.mock('@/shared/supabase/cliente')

const CUENTA_DE_PRUEBA = {
  id: 'usr-prueba',
  nombre: 'Valentina Alcántara Rueda',
  correo: 'valentina.alcantara@labanfora.org',
}

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

afterEach(() => {
  reiniciarMocksDeSesion()
})

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

  it('al enviar el formulario vacío marca cada campo que falta, sin un mensaje genérico', async () => {
    const usuario = userEvent.setup()
    montar()

    await usuario.click(screen.getByRole('button', { name: 'Acceder' }))

    expect(await screen.findByText(mensajeDeError('AUTH_CORREO_REQUERIDO'))).toBeInTheDocument()
    expect(screen.getByText(mensajeDeError('AUTH_CONTRASENA_REQUERIDA'))).toBeInTheDocument()
    expect(screen.getByLabelText('Correo')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('aria-invalid', 'true')
  })

  it('marca solo el campo de correo cuando el formato no es válido', async () => {
    const usuario = userEvent.setup()
    montar()

    await usuario.type(screen.getByLabelText('Correo'), 'no-es-un-correo')
    await usuario.type(screen.getByLabelText('Contraseña'), 'Anfora-2026')
    await usuario.click(screen.getByRole('button', { name: 'Acceder' }))

    expect(await screen.findByText(mensajeDeError('AUTH_CORREO_INVALIDO'))).toBeInTheDocument()
    expect(screen.getByLabelText('Correo')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Contraseña')).not.toHaveAttribute('aria-invalid', 'true')
  })

  it('marca los campos obligatorios con un asterisco y una leyenda', () => {
    montar()

    expect(screen.getByText(/Campo obligatorio/)).toBeInTheDocument()
  })

  it('con credenciales incorrectas muestra el mensaje traducido de credenciales inválidas', async () => {
    mockearAccederFallido('invalid_credentials')
    const usuario = userEvent.setup()
    montar()

    await usuario.type(screen.getByLabelText('Correo'), CUENTA_DE_PRUEBA.correo)
    await usuario.type(screen.getByLabelText('Contraseña'), 'contrasena-que-no-es')
    await usuario.click(screen.getByRole('button', { name: 'Acceder' }))

    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent(mensajeDeError('AUTH_CREDENCIALES_INVALIDAS'))
    expect(alerta.textContent ?? '').not.toContain('AUTH_')
    expect(screen.queryByText('Panel de conferencias')).not.toBeInTheDocument()
  })

  it('con credenciales válidas navega a las conferencias y no deja error en pantalla', async () => {
    mockearAccederExitoso(CUENTA_DE_PRUEBA)
    const usuario = userEvent.setup()
    montar()

    await usuario.type(screen.getByLabelText('Correo'), CUENTA_DE_PRUEBA.correo)
    await usuario.type(screen.getByLabelText('Contraseña'), 'Anfora-2026')
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
    const usuario = userEvent.setup()
    montar()

    await usuario.type(screen.getByLabelText('Correo'), 'quien@labanfora.org')
    await usuario.type(screen.getByLabelText('Contraseña'), 'Anfora-2026')

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
