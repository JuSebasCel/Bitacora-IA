import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { crearPlantillaDesdeDocx } from '../plantillas'
import type { MarcadorDeDocx } from '../data'
import { ConfirmacionDePlantillaDocx } from './ConfirmacionDePlantillaDocx'

const renderAsyncMock = vi.hoisted(() => vi.fn())

vi.mock('docx-preview', () => ({
  renderAsync: renderAsyncMock,
}))

afterEach(() => {
  renderAsyncMock.mockReset()
  vi.unstubAllGlobals()
})

function conFetchQueNuncaResuelve() {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => new Promise(() => {})),
  )
}

const MARCADOR_SIMPLE: MarcadorDeDocx = {
  tipo: 'simple',
  id: 'mar-1',
  textoOriginal: '[[Nombre grupo]]',
  contexto: 'Grupo de investigación: [[Nombre grupo]]',
  origenDeDato: { tipo: 'personalizado', etiqueta: 'Nombre grupo' },
  formato: 'parrafo',
}

const MARCADOR_CONDICIONAL: MarcadorDeDocx = {
  tipo: 'condicional',
  id: 'sec-1',
  descripcion: 'Cita opcional',
  origenDeDato: { tipo: 'personalizado', etiqueta: 'Cita opcional' },
}

describe('ConfirmacionDePlantillaDocx', () => {
  it('sin marcadores detectados, avisa que no se encontró ninguna marca', () => {
    conFetchQueNuncaResuelve()
    const plantilla = crearPlantillaDesdeDocx('data:;base64,AA==', 'Prueba', [])

    render(<ConfirmacionDePlantillaDocx plantilla={plantilla} alRenombrar={vi.fn()} />)

    expect(screen.getByText(/no encontramos ninguna marca/i)).toBeInTheDocument()
  })

  it('muestra el contexto de un marcador simple con el marcador resaltado, sin corchetes', () => {
    conFetchQueNuncaResuelve()
    const plantilla = crearPlantillaDesdeDocx('data:;base64,AA==', 'Prueba', [MARCADOR_SIMPLE])

    render(<ConfirmacionDePlantillaDocx plantilla={plantilla} alRenombrar={vi.fn()} />)

    expect(screen.getByText('Grupo de investigación:', { exact: false })).toBeInTheDocument()
    expect(screen.getByText('Nombre grupo')).toBeInTheDocument()
    expect(screen.queryByText('[[Nombre grupo]]')).not.toBeInTheDocument()
  })

  it('muestra la insignia correcta para una sección condicional', () => {
    conFetchQueNuncaResuelve()
    const plantilla = crearPlantillaDesdeDocx('data:;base64,AA==', 'Prueba', [MARCADOR_CONDICIONAL])

    render(<ConfirmacionDePlantillaDocx plantilla={plantilla} alRenombrar={vi.fn()} />)

    expect(screen.getByText('Cita opcional')).toBeInTheDocument()
    expect(screen.getByText('Condicional')).toBeInTheDocument()
  })

  it('escribir en el campo Nombre llama a alRenombrar con el valor tecleado', async () => {
    conFetchQueNuncaResuelve()
    const usuario = userEvent.setup()
    const plantilla = crearPlantillaDesdeDocx('data:;base64,AA==', 'Prueba', [])
    const alRenombrar = vi.fn()

    render(<ConfirmacionDePlantillaDocx plantilla={plantilla} alRenombrar={alRenombrar} />)
    await usuario.type(screen.getByLabelText('Nombre'), 'X')

    expect(alRenombrar).toHaveBeenCalledWith('PruebaX')
  })

  it('no hay ningún control para mapear campo u origen — solo lectura', () => {
    conFetchQueNuncaResuelve()
    const plantilla = crearPlantillaDesdeDocx('data:;base64,AA==', 'Prueba', [MARCADOR_SIMPLE, MARCADOR_CONDICIONAL])

    render(<ConfirmacionDePlantillaDocx plantilla={plantilla} alRenombrar={vi.fn()} />)

    expect(screen.queryAllByRole('combobox')).toHaveLength(0)
    expect(screen.queryByRole('button', { name: /generar vista previa/i })).not.toBeInTheDocument()
  })

  it('una vez que el archivo original se lee, aparece el enlace de descarga', async () => {
    const blob = new Blob(['contenido'])
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ blob: () => Promise.resolve(blob) }) as unknown as Promise<Response>),
    )
    renderAsyncMock.mockResolvedValue(undefined)
    const plantilla = crearPlantillaDesdeDocx('data:;base64,AA==', 'Prueba', [])

    render(<ConfirmacionDePlantillaDocx plantilla={plantilla} alRenombrar={vi.fn()} />)

    await waitFor(() => expect(screen.getByText('Descargar plantilla')).toBeInTheDocument())
    const enlace = screen.getByText('Descargar plantilla').closest('a')
    expect(enlace).toHaveAttribute('download', 'Prueba.docx')
  })
})
