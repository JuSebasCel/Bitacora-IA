import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SessionProvider } from '@/features/auth/session'
import { mensajeDeError } from '@/shared/errors'
import { mockearRegistrarExitoso, mockearRegistrarFallido, reiniciarMocksDeSesion } from '@/test/sesionDePrueba'
import { PantallaRegistro } from './PantallaRegistro'

vi.mock('@/shared/supabase/cliente')

const CORREO_VALIDO = 'alguien@labanfora.org'
const CONTRASENA_VALIDA = 'Segura#2026x'

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

/** Avanza del paso "correo" al paso "detalles" con un correo válido. */
async function avanzarADetalles(usuario: ReturnType<typeof userEvent.setup>, correo = CORREO_VALIDO): Promise<void> {
  await usuario.type(screen.getByLabelText('Correo'), correo)
  await usuario.click(screen.getByRole('button', { name: 'Continuar' }))
}

afterEach(() => {
  reiniciarMocksDeSesion()
})

describe('PantallaRegistro', () => {
  it('empieza pidiendo solo el correo', () => {
    montar()

    expect(screen.getByLabelText('Correo')).toHaveAttribute('type', 'email')
    expect(screen.queryByLabelText('Nombre')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Contraseña')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeInTheDocument()
  })

  it('no avanza de paso si el correo está vacío o mal formado', async () => {
    const usuario = userEvent.setup()
    montar()

    await usuario.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(await screen.findByText(mensajeDeError('AUTH_CORREO_REQUERIDO'))).toBeInTheDocument()
    expect(screen.queryByLabelText('Nombre')).not.toBeInTheDocument()

    await usuario.type(screen.getByLabelText('Correo'), 'no-es-un-correo')
    await usuario.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(await screen.findByText(mensajeDeError('AUTH_CORREO_INVALIDO'))).toBeInTheDocument()
    expect(screen.queryByLabelText('Nombre')).not.toBeInTheDocument()
  })

  it('con un correo válido pasa al paso de nombre y contraseña, mostrando el correo elegido', async () => {
    const usuario = userEvent.setup()
    montar()

    await avanzarADetalles(usuario)

    expect(screen.getByText(CORREO_VALIDO)).toBeInTheDocument()
    expect(screen.getByLabelText('Nombre')).toBeInTheDocument()
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('autocomplete', 'new-password')
    expect(screen.queryByLabelText('Correo')).not.toBeInTheDocument()
  })

  it('"Cambiar" vuelve al paso del correo conservando lo escrito', async () => {
    const usuario = userEvent.setup()
    montar()

    await avanzarADetalles(usuario)
    await usuario.click(screen.getByRole('button', { name: 'Cambiar' }))

    expect(screen.getByLabelText('Correo')).toHaveValue(CORREO_VALIDO)
  })

  it('muestra los requisitos de la contraseña como una lista que cambia de rojo a verde', async () => {
    const usuario = userEvent.setup()
    montar()

    await avanzarADetalles(usuario)

    expect(screen.getByText('Al menos 8 caracteres')).toBeInTheDocument()
    expect(screen.getByText('Un símbolo')).toBeInTheDocument()

    await usuario.type(screen.getByLabelText('Contraseña'), CONTRASENA_VALIDA)

    for (const regla of ['Al menos 8 caracteres', 'Una mayúscula', 'Una minúscula', 'Un número', 'Un símbolo']) {
      expect(screen.getByText(regla).closest('li')).toHaveClass('text-validado')
    }
  })

  it('al enviar sin nombre marca ese campo, sin llamar a registrar', async () => {
    const usuario = userEvent.setup()
    montar()

    await avanzarADetalles(usuario)
    await usuario.type(screen.getByLabelText('Contraseña'), CONTRASENA_VALIDA)
    await usuario.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(await screen.findByText(mensajeDeError('AUTH_NOMBRE_REQUERIDO'))).toBeInTheDocument()
  })

  it('al enviar con una contraseña que no cumple los requisitos la marca, sin llamar a registrar', async () => {
    const usuario = userEvent.setup()
    montar()

    await avanzarADetalles(usuario)
    await usuario.type(screen.getByLabelText('Nombre'), 'Alguien Cualquiera')
    await usuario.type(screen.getByLabelText('Contraseña'), 'simple123')
    await usuario.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(await screen.findByText(mensajeDeError('AUTH_CONTRASENA_DEBIL'))).toBeInTheDocument()
  })

  it('con un correo ya registrado vuelve al paso del correo y lo marca ahí', async () => {
    mockearRegistrarFallido('user_already_exists')
    const usuario = userEvent.setup()
    montar()

    await avanzarADetalles(usuario)
    await usuario.type(screen.getByLabelText('Nombre'), 'Otra Persona')
    await usuario.type(screen.getByLabelText('Contraseña'), CONTRASENA_VALIDA)
    await usuario.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(await screen.findByLabelText('Correo')).toHaveValue(CORREO_VALIDO)
    expect(screen.getByText(mensajeDeError('AUTH_CORREO_YA_REGISTRADO'))).toBeInTheDocument()
  })

  it('con un correo nuevo navega a las conferencias', async () => {
    mockearRegistrarExitoso({
      id: 'usr-mariana',
      nombre: 'Mariana Osorio Cifuentes',
      correo: 'mariana.osorio@labanfora.org',
    })
    const usuario = userEvent.setup()
    montar()

    await avanzarADetalles(usuario, 'mariana.osorio@labanfora.org')
    await usuario.type(screen.getByLabelText('Nombre'), 'Mariana Osorio Cifuentes')
    await usuario.type(screen.getByLabelText('Contraseña'), CONTRASENA_VALIDA)
    await usuario.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(await screen.findByText('Panel de conferencias')).toBeInTheDocument()
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
