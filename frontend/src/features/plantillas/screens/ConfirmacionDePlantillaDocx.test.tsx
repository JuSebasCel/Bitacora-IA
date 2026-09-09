import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { crearPlantillaDesdeDocx } from '../plantillas'
import type { MarcadorDeDocx } from '../data'
import { ConfirmacionDePlantillaDocx } from './ConfirmacionDePlantillaDocx'

const renderAsyncMock = vi.hoisted(() => vi.fn())
const descargarMock = vi.hoisted(() => vi.fn())

vi.mock('docx-preview', () => ({
  renderAsync: renderAsyncMock,
}))

/*
  Se sustituye el repositorio y no el cliente de Supabase: la pantalla depende
  de "dame el .docx de esta plantilla", no de cómo se resuelve esa frase.
*/
vi.mock('../repositorio', () => ({
  descargarDocxDePlantilla: descargarMock,
}))

const ID_DE_PRUEBA = 'a2c0f7d1-9b3e-4a52-8f10-6d5c4b3a2e11'
const RUTA_DE_PRUEBA = `${ID_DE_PRUEBA}/original.docx`

beforeEach(() => {
  conDescargaQueNuncaResuelve()
})

afterEach(() => {
  renderAsyncMock.mockReset()
  descargarMock.mockReset()
})

function conDescargaQueNuncaResuelve() {
  descargarMock.mockImplementation(() => new Promise(() => {}))
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
    const plantilla = crearPlantillaDesdeDocx(ID_DE_PRUEBA, RUTA_DE_PRUEBA, 'Prueba', [])

    render(<ConfirmacionDePlantillaDocx plantilla={plantilla} alRenombrar={vi.fn()} />)

    expect(screen.getByText(/no encontramos ninguna marca/i)).toBeInTheDocument()
  })

  it('muestra el contexto de un marcador simple con el marcador resaltado, sin corchetes', () => {
    const plantilla = crearPlantillaDesdeDocx(ID_DE_PRUEBA, RUTA_DE_PRUEBA, 'Prueba', [MARCADOR_SIMPLE])

    render(<ConfirmacionDePlantillaDocx plantilla={plantilla} alRenombrar={vi.fn()} />)

    expect(screen.getByText('Grupo de investigación:', { exact: false })).toBeInTheDocument()
    expect(screen.getByText('Nombre grupo')).toBeInTheDocument()
    expect(screen.queryByText('[[Nombre grupo]]')).not.toBeInTheDocument()
  })

  it('muestra la insignia correcta para una sección condicional', () => {
    const plantilla = crearPlantillaDesdeDocx(ID_DE_PRUEBA, RUTA_DE_PRUEBA, 'Prueba', [MARCADOR_CONDICIONAL])

    render(<ConfirmacionDePlantillaDocx plantilla={plantilla} alRenombrar={vi.fn()} />)

    expect(screen.getByText('Cita opcional')).toBeInTheDocument()
    expect(screen.getByText('Condicional')).toBeInTheDocument()
  })

  it('escribir en el campo Nombre llama a alRenombrar con el valor tecleado', async () => {
    const usuario = userEvent.setup()
    const plantilla = crearPlantillaDesdeDocx(ID_DE_PRUEBA, RUTA_DE_PRUEBA, 'Prueba', [])
    const alRenombrar = vi.fn()

    render(<ConfirmacionDePlantillaDocx plantilla={plantilla} alRenombrar={alRenombrar} />)
    await usuario.type(screen.getByLabelText('Nombre'), 'X')

    expect(alRenombrar).toHaveBeenCalledWith('PruebaX')
  })

  it('no hay ningún control para mapear campo u origen — solo lectura', () => {
    const plantilla = crearPlantillaDesdeDocx(ID_DE_PRUEBA, RUTA_DE_PRUEBA, 'Prueba', [MARCADOR_SIMPLE, MARCADOR_CONDICIONAL])

    render(<ConfirmacionDePlantillaDocx plantilla={plantilla} alRenombrar={vi.fn()} />)

    expect(screen.queryAllByRole('combobox')).toHaveLength(0)
    expect(screen.queryByRole('button', { name: /generar vista previa/i })).not.toBeInTheDocument()
  })

  it('una vez que el archivo original baja del bucket, aparece el enlace de descarga', async () => {
    const blob = new Blob(['contenido'])
    descargarMock.mockResolvedValue({ ok: true, datos: blob })
    renderAsyncMock.mockResolvedValue(undefined)
    const plantilla = crearPlantillaDesdeDocx(ID_DE_PRUEBA, RUTA_DE_PRUEBA, 'Prueba', [])

    render(<ConfirmacionDePlantillaDocx plantilla={plantilla} alRenombrar={vi.fn()} />)

    await waitFor(() => expect(screen.getByText('Descargar plantilla')).toBeInTheDocument())
    const enlace = screen.getByText('Descargar plantilla').closest('a')
    expect(enlace).toHaveAttribute('download', 'Prueba.docx')
  })

  /*
    Que el archivo no baje no invalida la plantilla: sus marcadores viven en la
    fila y se siguen viendo. Lo que no puede pasar es quedarse callado, con la
    vista previa vacía insinuando que el documento se perdió.
  */
  it('si el archivo original no se puede descargar, lo dice con nombre propio y conserva los marcadores', async () => {
    descargarMock.mockResolvedValue({ ok: false, codigo: 'PLANT_DOCX_FALLO_DESCARGA' })
    const plantilla = crearPlantillaDesdeDocx(ID_DE_PRUEBA, RUTA_DE_PRUEBA, 'Prueba', [MARCADOR_SIMPLE])

    render(<ConfirmacionDePlantillaDocx plantilla={plantilla} alRenombrar={vi.fn()} />)

    expect(await screen.findByText(/no pudimos recuperar el archivo original/i)).toBeInTheDocument()
    expect(screen.getByText('Nombre grupo')).toBeInTheDocument()
    expect(screen.queryByText('Descargar plantilla')).not.toBeInTheDocument()
  })
})
