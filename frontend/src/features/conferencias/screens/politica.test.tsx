import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { SessionProvider } from '@/features/auth/session'
import { CLAVE_SESION } from '@/features/auth/session/almacenamiento'
import { PantallaConferencias } from './PantallaConferencias'

/*
  Reglas de redacción de las pantallas de F2.

  Son las mismas que `app/placeholders/pantallas.test.tsx` aplica a los
  marcadores de posición, menos tres palabras que aquí no significan lo mismo.

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

function montar() {
  sessionStorage.setItem(
    CLAVE_SESION,
    JSON.stringify({
      id: 'usr-zuluaga',
      nombre: 'Camila Zuluaga Nieto',
      correo: 'camila.zuluaga@labanfora.org',
    }),
  )

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
