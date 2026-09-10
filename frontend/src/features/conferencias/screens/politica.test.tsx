import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SessionProvider } from '@/features/auth/session'
import { mockearSesionAutenticada, reiniciarMocksDeSesion } from '@/test/sesionDePrueba'
import { sembrarConferencias } from '@/test/conferenciasDePrueba'
import { PantallaConferencias } from './PantallaConferencias'

vi.mock('@/shared/supabase/cliente')
vi.mock('@/features/conferencias/repositorio')

/*
  Reglas de redacción de las pantallas de F2.

  Mismo criterio que el resto de pantallas del proyecto, menos tres palabras
  que aquí no significan lo mismo.

  "Pendiente", "aún no" y "no disponible" quedan fuera de la lista prohibida en
  este módulo: describen el estado de un dato (una ficha pendiente de revisión,
  una conferencia cuyo procesamiento aún no terminó), no el estado del
  producto. Prohibirlas obligaría a inventar sinónimos peores para el
  vocabulario central del dominio.

  Lo que sí se conserva es todo lo que suena a obra en curso, y la prohibición
  del guion largo.
*/

const LENGUAJE_DE_OBRA_EN_CURSO =
  /próximamente|proximamente|en construcción|en construccion|wip|beta|disponible pronto|v0\.\d/i

/* Guion largo, escrito como escape para no usarlo literalmente en el código. */
const GUION_LARGO = '—'

beforeEach(() => {
  sembrarConferencias()
})

afterEach(() => {
  reiniciarMocksDeSesion()
})

function montar() {
  mockearSesionAutenticada({
    id: 'ad474b7c-4a6e-4092-8c7e-ccf8701d9178',
    nombre: 'Camila Zuluaga Nieto',
    correo: 'camila.zuluaga@labanfora.org',
  })

  return render(
    <SessionProvider>
      <MemoryRouter initialEntries={['/conferencias']}>
        <PantallaConferencias />
      </MemoryRouter>
    </SessionProvider>,
  )
}

describe('Redacción de la pantalla de conferencias', () => {
  it('se anuncia con un encabezado de nivel 1', async () => {
    montar()

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Conferencias' }),
    ).toBeInTheDocument()
  })

  it('describe con una línea qué trabajo se hace en la sección', async () => {
    montar()

    const encabezado = await screen.findByRole('heading', { level: 1, name: 'Conferencias' })
    const descripcion = encabezado.parentElement?.textContent?.replace('Conferencias', '').trim()

    expect((descripcion ?? '').length).toBeGreaterThan(30)
  })

  it('no usa lenguaje de obra en curso', async () => {
    montar()
    await screen.findByRole('list', { name: 'Conferencias' })

    expect(document.body.textContent ?? '').not.toMatch(LENGUAJE_DE_OBRA_EN_CURSO)
  })

  it('no usa el guion largo en ningún texto visible', async () => {
    montar()
    await screen.findByRole('list', { name: 'Conferencias' })

    expect(document.body.textContent ?? '').not.toContain(GUION_LARGO)
  })
})
