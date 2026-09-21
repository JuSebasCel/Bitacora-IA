import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SessionProvider } from '@/features/auth/session'
import { mockearSesionAutenticada, reiniciarMocksDeSesion } from '@/test/sesionDePrueba'
import { PanelDeGenerarMemoria } from './PanelDeGenerarMemoria'

vi.mock('@/shared/supabase/cliente')

const ALCANTARA = {
  id: '1ba5af9a-f6a2-4504-ab60-1f018c21290a',
  nombre: 'Valentina Alcántara Rueda',
  correo: 'valentina.alcantara@labanfora.org',
}

beforeEach(() => {
  mockearSesionAutenticada(ALCANTARA)
})

afterEach(() => {
  reiniciarMocksDeSesion()
})

function montar() {
  return render(
    <MemoryRouter>
      <SessionProvider>
        <PanelDeGenerarMemoria abierto alCerrar={vi.fn()} generar={vi.fn()} alGenerar={vi.fn()} />
      </SessionProvider>
    </MemoryRouter>,
  )
}

/*
  El campo "Nombre" autocompleta "Memoria de <título>" al elegir una
  conferencia (ver el efecto en `PanelDeGenerarMemoria.tsx`), pero antes de
  elegir nada se queda vacío y sin ninguna pista de qué se espera ahí, a
  diferencia de `DialogoDeCreacion.tsx`/`CreadorDeEtiqueta.tsx`, que sí traen
  un placeholder de ejemplo.
*/
describe('PanelDeGenerarMemoria, campo Nombre', () => {
  it('trae un placeholder de ejemplo coherente con el autocompletado', () => {
    montar()

    expect(screen.getByLabelText('Nombre')).toHaveAttribute(
      'placeholder',
      'ej. Memoria de <título de la conferencia>',
    )
  })
})
