import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { crearPlantillaDesdeDocx } from '../plantillas'
import { PantallaEditorDePlantilla } from './PantallaEditorDePlantilla'
import { PantallaPlantillas } from './PantallaPlantillas'

/* Mismo criterio que el resto de pruebas de pantalla: se sustituye el repositorio, no Supabase. */
const repositorio = vi.hoisted(() => ({
  listarPlantillas: vi.fn(),
  crearPlantilla: vi.fn(),
  actualizarPlantilla: vi.fn(),
  eliminarPlantilla: vi.fn(),
  subirDocxDePlantilla: vi.fn(),
  descargarDocxDePlantilla: vi.fn(),
  eliminarDocxDePlantilla: vi.fn(),
}))

vi.mock('../repositorio', () => repositorio)

const ID = 'a2c0f7d1-9b3e-4a52-8f10-6d5c4b3a2e11'
const PLANTILLA = crearPlantillaDesdeDocx(ID, `${ID}/original.docx`, 'Memoria estándar', [])

/*
  Reglas de redacción de las pantallas de F4. Mismo criterio que
  `features/conferencias/screens/politica.test.tsx`, con las palabras propias
  de este dominio ya fuera de la lista prohibida donde aplica.
*/

const LENGUAJE_DE_OBRA_EN_CURSO =
  /próximamente|proximamente|en construcción|en construccion|wip|beta|disponible pronto|v0\.\d/i

/* Guion largo, escrito como escape para no usarlo literalmente en el código. */
const GUION_LARGO = '—'

beforeEach(() => {
  repositorio.listarPlantillas.mockResolvedValue({ ok: true, datos: [PLANTILLA] })
  repositorio.actualizarPlantilla.mockResolvedValue({ ok: true, datos: PLANTILLA })
  repositorio.eliminarPlantilla.mockResolvedValue({ ok: true, datos: null })
  repositorio.descargarDocxDePlantilla.mockImplementation(() => new Promise(() => {}))
})

/*
  Se desmonta antes de vaciar los simulacros. Vitest corre este `afterEach`
  antes que el de `test/setup.ts`, así que sin esto los componentes seguían
  montados con el simulacro de descarga ya vacío: si React volvía a pintar en
  ese hueco, `useDocxDePlantilla` llamaba a un simulacro sin implementación
  y la prueba caía de vez en cuando, según el reloj.
*/
afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})

function montarListado() {
  return render(
    <MemoryRouter initialEntries={['/plantillas']}>
      <Routes>
        <Route path="/plantillas" element={<PantallaPlantillas />} />
        <Route path="/plantillas/:idPlantilla" element={<p>Editor</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

function montarEditor() {
  return render(
    <MemoryRouter initialEntries={[`/plantillas/${PLANTILLA.id}`]}>
      <Routes>
        <Route path="/plantillas" element={<p>Listado</p>} />
        <Route path="/plantillas/:idPlantilla" element={<PantallaEditorDePlantilla />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('Redacción de la pantalla de plantillas', () => {
  it('se anuncia con un encabezado de nivel 1', () => {
    montarListado()

    expect(screen.getByRole('heading', { level: 1, name: 'Plantillas' })).toBeInTheDocument()
  })

  it('mientras carga, el esqueleto se anuncia con un texto que dice qué se está esperando', () => {
    repositorio.listarPlantillas.mockReturnValue(new Promise(() => {}))
    montarListado()

    expect(screen.getByLabelText('Cargando las plantillas')).toBeInTheDocument()
  })

  it('describe con una línea qué trabajo se hace en la sección', () => {
    montarListado()

    const encabezado = screen.getByRole('heading', { level: 1, name: 'Plantillas' })
    const descripcion = encabezado.parentElement?.textContent?.replace('Plantillas', '').trim() ?? ''

    expect(descripcion.length).toBeGreaterThan(30)
  })

  it('no usa lenguaje de obra en curso', async () => {
    montarListado()
    await screen.findByText(PLANTILLA.nombre)

    expect(document.body.textContent ?? '').not.toMatch(LENGUAJE_DE_OBRA_EN_CURSO)
  })

  it('no usa el guion largo en ningún texto visible', async () => {
    montarListado()
    await screen.findByText(PLANTILLA.nombre)

    expect(document.body.textContent ?? '').not.toContain(GUION_LARGO)
  })
})

describe('Redacción de la pantalla del editor de plantillas', () => {
  it('no usa lenguaje de obra en curso', async () => {
    montarEditor()
    await screen.findByRole('button', { name: /Nombre de la plantilla/ })

    expect(document.body.textContent ?? '').not.toMatch(LENGUAJE_DE_OBRA_EN_CURSO)
  })

  it('no usa el guion largo en ningún texto visible', async () => {
    montarEditor()
    await screen.findByRole('button', { name: /Nombre de la plantilla/ })

    expect(document.body.textContent ?? '').not.toContain(GUION_LARGO)
  })
})
