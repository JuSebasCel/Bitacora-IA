import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SessionProvider } from '@/features/auth/session'
import { CLAVE_SESION } from '@/features/auth/session/almacenamiento'
import { PanelDeGenerarMemoria } from './PanelDeGenerarMemoria'

const ALCANTARA = {
  id: 'usr-alcantara',
  nombre: 'Valentina Alcántara Rueda',
  correo: 'valentina.alcantara@labanfora.org',
}

beforeEach(() => {
  sessionStorage.clear()
  sessionStorage.setItem(CLAVE_SESION, JSON.stringify(ALCANTARA))
})

function montar() {
  return render(
    <SessionProvider>
      <PanelDeGenerarMemoria abierto alCerrar={vi.fn()} generar={vi.fn()} alGenerar={vi.fn()} />
    </SessionProvider>,
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
