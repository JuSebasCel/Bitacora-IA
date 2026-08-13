import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { SessionProvider } from '@/features/auth/session'
import { CLAVE_SESION } from '@/features/auth/session/almacenamiento'
import { CONFERENCIAS_DE_EJEMPLO, FICHAS_DE_EJEMPLO } from '@/features/conferencias/data'
import { useConferenciasVisibles } from '@/features/conferencias/components/useConferenciasVisibles'
import { conferenciasVisibles, fichasDelCatalogo } from '@/features/conferencias/query'
import { PantallaCatalogo } from './PantallaCatalogo'

/*
  `useConferenciasVisibles` resuelve su efecto dentro del mismo render en las
  pruebas, así que el estado "cargando" nunca llega a observarse montando la
  pantalla normal (mismo caso ya documentado en
  `conferencias/screens/PantallaConferencias.test.tsx`). Para probar que
  `PantallaCatalogo` sí atiende ese estado hay que forzarlo desde el mock.
*/
vi.mock('@/features/conferencias/components/useConferenciasVisibles', async (importarOriginal) => {
  const original =
    await importarOriginal<typeof import('@/features/conferencias/components/useConferenciasVisibles')>()

  return {
    ...original,
    useConferenciasVisibles: vi.fn(original.useConferenciasVisibles),
  }
})

/*
  Alcántara es la cuenta de referencia porque ya se usa en `useCatalogo.test.tsx`
  para calcular el total esperado sin fijarlo a mano: si el fixture cambia,
  `totalVisibleDe` cambia con él y la prueba no queda desalineada.
*/

const ALCANTARA = {
  id: 'usr-alcantara',
  nombre: 'Valentina Alcántara Rueda',
  correo: 'valentina.alcantara@labanfora.org',
}

function totalVisibleDe(idUsuario: string): number {
  return fichasDelCatalogo(FICHAS_DE_EJEMPLO, conferenciasVisibles(CONFERENCIAS_DE_EJEMPLO, idUsuario)).length
}

function Ubicacion() {
  const ubicacion = useLocation()

  return <span data-testid="ubicacion">{`${ubicacion.pathname}${ubicacion.search}`}</span>
}

function montar(rutaInicial = '/catalogo', cuenta = ALCANTARA) {
  sessionStorage.setItem(CLAVE_SESION, JSON.stringify(cuenta))

  return render(
    <SessionProvider>
      <MemoryRouter initialEntries={[rutaInicial]}>
        <Ubicacion />
        <Routes>
          <Route path="/catalogo" element={<PantallaCatalogo />} />
          <Route path="/conferencias/:idConferencia" element={<p>Detalle de la conferencia</p>} />
        </Routes>
      </MemoryRouter>
    </SessionProvider>,
  )
}

function ubicacion(): string {
  return screen.getByTestId('ubicacion').textContent ?? ''
}

async function resultados(): Promise<HTMLElement[]> {
  const lista = await screen.findByRole('list', { name: /catálogo/i })
  return within(lista).getAllByRole('listitem')
}

describe('PantallaCatalogo', () => {
  it('se anuncia con su encabezado de sección', async () => {
    montar()

    expect(await screen.findByRole('heading', { level: 1, name: 'Catálogo' })).toBeInTheDocument()
  })

  it('lista todas las fichas visibles para esa cuenta, de todas sus conferencias', async () => {
    montar()

    expect(await resultados()).toHaveLength(totalVisibleDe(ALCANTARA.id))
  })

  it('enlaza cada resultado con el detalle de la conferencia de origen', async () => {
    montar()

    const [primeraEntrada] = fichasDelCatalogo(
      FICHAS_DE_EJEMPLO,
      conferenciasVisibles(CONFERENCIAS_DE_EJEMPLO, ALCANTARA.id),
    )
    if (primeraEntrada === undefined) throw new Error('el fixture no tiene fichas visibles para esta cuenta')

    const enlaces = await screen.findAllByRole('link', {
      name: new RegExp(primeraEntrada.conferencia.titulo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    })

    for (const enlace of enlaces) {
      expect(enlace).toHaveAttribute('href', expect.stringContaining(`/conferencias/${primeraEntrada.conferencia.id}`))
    }
  })

  it('filtra por texto y lo deja escrito en la URL', async () => {
    const usuario = userEvent.setup()
    montar()
    await resultados()

    const [primeraEntrada] = fichasDelCatalogo(
      FICHAS_DE_EJEMPLO,
      conferenciasVisibles(CONFERENCIAS_DE_EJEMPLO, ALCANTARA.id),
    )
    if (primeraEntrada === undefined) throw new Error('el fixture no tiene fichas visibles para esta cuenta')

    const [primeraPalabra = ''] = primeraEntrada.ficha.tema.split(' ')

    await usuario.type(await screen.findByLabelText(/buscar/i), primeraPalabra)

    await waitFor(() => expect(ubicacion()).toContain(`buscar=${encodeURIComponent(primeraPalabra)}`))
    for (const fila of await resultados()) {
      expect(fila.textContent?.toLowerCase()).toContain(primeraPalabra.toLowerCase())
    }
  })

  it('filtra por tema desde el popover de filtros', async () => {
    const usuario = userEvent.setup()
    montar()
    await resultados()

    const [primeraEntrada] = fichasDelCatalogo(
      FICHAS_DE_EJEMPLO,
      conferenciasVisibles(CONFERENCIAS_DE_EJEMPLO, ALCANTARA.id),
    )
    if (primeraEntrada === undefined) throw new Error('el fixture no tiene fichas visibles para esta cuenta')

    await usuario.click(screen.getByRole('button', { name: 'Filtros' }))
    await usuario.click(await screen.findByRole('radio', { name: primeraEntrada.ficha.tema }))

    await waitFor(() => expect(ubicacion()).toContain('tema='))

    const filas = await resultados()
    expect(filas.length).toBeGreaterThan(0)
    for (const fila of filas) {
      expect(fila.textContent).toContain(primeraEntrada.ficha.tema)
    }
  })

  it('distingue el vacío por filtros del vacío por falta de datos', async () => {
    montar('/catalogo?buscar=palabraquenoexisteenningunfragmento')

    expect(await screen.findByText(/ningún resultado/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /quitar filtros/i })).toBeInTheDocument()
  })

  it('muestra un esqueleto de carga mientras se resuelve lo visible, no el vacío', () => {
    vi.mocked(useConferenciasVisibles).mockReturnValueOnce({
      carga: 'cargando',
      visibles: [],
      recargar: vi.fn(),
    })

    montar()

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByText(/todavía no hay fichas/i)).not.toBeInTheDocument()
  })

  it('restablece el catálogo completo al quitar los filtros', async () => {
    const usuario = userEvent.setup()
    montar('/catalogo?buscar=palabraquenoexisteenningunfragmento')

    await usuario.click(await screen.findByRole('button', { name: /quitar filtros/i }))

    await waitFor(async () => expect(await resultados()).toHaveLength(totalVisibleDe(ALCANTARA.id)))
    expect(ubicacion()).toBe('/catalogo')
  })
})
