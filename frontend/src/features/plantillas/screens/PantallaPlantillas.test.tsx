import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { MemoryRouter, Route, Routes, useParams } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CLAVE_PLANTILLAS } from '../almacenamiento'
import { crearPlantillaEnBlanco } from '../plantillas'
import { PantallaPlantillas } from './PantallaPlantillas'

const renderAsyncMock = vi.hoisted(() => vi.fn())

vi.mock('docx-preview', () => ({
  renderAsync: renderAsyncMock,
}))

const TIPO_MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const RUTA_DOCX_DE_EJEMPLO = resolve(process.cwd(), 'tests/fixtures/tem.docx')

function archivoDocxReal(): File {
  const buffer = readFileSync(RUTA_DOCX_DE_EJEMPLO)
  return new File([buffer], 'tem.docx', { type: TIPO_MIME_DOCX })
}

beforeEach(() => {
  sessionStorage.clear()
  vi.stubGlobal(
    'fetch',
    vi.fn(() => new Promise(() => {})),
  )
})

afterEach(() => {
  renderAsyncMock.mockReset()
  vi.unstubAllGlobals()
})

function EditorEspia() {
  const { idPlantilla } = useParams()
  return <p>Editor de {idPlantilla}</p>
}

function montar() {
  return render(
    <MemoryRouter initialEntries={['/plantillas']}>
      <Routes>
        <Route path="/plantillas" element={<PantallaPlantillas />} />
        <Route path="/plantillas/:idPlantilla" element={<EditorEspia />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('PantallaPlantillas', () => {
  it('lista las plantillas existentes', () => {
    montar()

    expect(screen.getByText('Memoria estándar')).toBeInTheDocument()
    expect(screen.getByText('Cita simple')).toBeInTheDocument()
  })

  it('crear plantilla la agrega sin pedir nombre y navega directo a su editor', async () => {
    const usuario = userEvent.setup()
    montar()

    await usuario.click(screen.getByRole('button', { name: 'Crear plantilla' }))

    expect(await screen.findByText(/^Editor de pla-/)).toBeInTheDocument()
    expect(sessionStorage.getItem(CLAVE_PLANTILLAS)).toContain('Plantilla sin nombre')
  })

  it('importar un .docx no admitido muestra un error y no navega', async () => {
    montar()

    const entrada = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(entrada, { target: { files: [new File(['x'], 'imagen.png', { type: 'image/png' })] } })

    expect(await screen.findByText(/no es un \.docx admitido/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Plantillas' })).toBeInTheDocument()
  })

  it('importar el .docx real detecta sus marcadores y navega al editor de la nueva plantilla', async () => {
    montar()

    const entrada = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(entrada, { target: { files: [archivoDocxReal()] } })

    expect(await screen.findByText(/^Editor de pla-/)).toBeInTheDocument()
    expect(sessionStorage.getItem(CLAVE_PLANTILLAS)).toContain('tem')
  })

  it('elimina una plantilla existente de la lista y de sessionStorage', async () => {
    const usuario = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    montar()

    await usuario.click(screen.getByRole('button', { name: 'Eliminar «Cita simple»' }))

    await waitFor(() => expect(screen.queryByText('Cita simple')).not.toBeInTheDocument())
    expect(sessionStorage.getItem(CLAVE_PLANTILLAS) ?? '').not.toContain('Cita simple')
  })

  /*
    Cada tarjeta puede eliminarse, así que quedarse en cero es alcanzable y no
    un caso imposible: sin este vacío la pantalla quedaba en blanco, sin decir
    qué pasó ni por dónde salir. El arreglo vacío guardado es "se borró todo a
    propósito", distinto de no haber guardado nunca nada (que cae a la semilla).
  */
  it('sin ninguna plantilla, explica el vacío en vez de dejar la lista en blanco', () => {
    sessionStorage.setItem(CLAVE_PLANTILLAS, JSON.stringify([]))

    montar()

    expect(screen.getByText('Todavía no hay plantillas')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Plantillas' })).not.toBeInTheDocument()
  })

  it('al montar, poda cualquier plantilla en blanco abandonada que haya quedado guardada', () => {
    const abandonada = crearPlantillaEnBlanco()
    sessionStorage.setItem(CLAVE_PLANTILLAS, JSON.stringify([abandonada]))

    montar()

    expect(screen.queryByText('Plantilla sin nombre')).not.toBeInTheDocument()
  })
})
