import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { MemoryRouter, Route, Routes, useParams } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Plantilla } from '../data'
import { crearPlantillaEnBlanco } from '../plantillas'
import { PantallaPlantillas } from './PantallaPlantillas'

const renderAsyncMock = vi.hoisted(() => vi.fn())

vi.mock('docx-preview', () => ({
  renderAsync: renderAsyncMock,
}))

/*
  Se sustituye el repositorio de plantillas, no el cliente de Supabase: esta
  pantalla depende de "dame las plantillas / guarda esta", y probarla contra
  cadenas de PostgREST la ataría a cómo se arma la consulta, que es justo lo
  que puede cambiar sin que nada esté mal.
*/
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

const TIPO_MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const RUTA_DOCX_DE_EJEMPLO = resolve(process.cwd(), 'tests/fixtures/tem.docx')

function archivoDocxReal(): File {
  const buffer = readFileSync(RUTA_DOCX_DE_EJEMPLO)
  return new File([buffer], 'tem.docx', { type: TIPO_MIME_DOCX })
}

function plantillaLlamada(nombre: string): Plantilla {
  return { ...crearPlantillaEnBlanco(), nombre }
}

const ESTANDAR = plantillaLlamada('Memoria estándar')
const CITA_SIMPLE = plantillaLlamada('Cita simple')

beforeEach(() => {
  repositorio.listarPlantillas.mockResolvedValue({ ok: true, datos: [ESTANDAR, CITA_SIMPLE] })
  repositorio.crearPlantilla.mockImplementation((plantilla: Plantilla) =>
    Promise.resolve({ ok: true, datos: plantilla }),
  )
  repositorio.actualizarPlantilla.mockImplementation((plantilla: Plantilla) =>
    Promise.resolve({ ok: true, datos: plantilla }),
  )
  repositorio.eliminarPlantilla.mockResolvedValue({ ok: true, datos: null })
  repositorio.subirDocxDePlantilla.mockImplementation((id: string) =>
    Promise.resolve({ ok: true, datos: `${id}/original.docx` }),
  )
  repositorio.descargarDocxDePlantilla.mockImplementation(() => new Promise(() => {}))
  repositorio.eliminarDocxDePlantilla.mockResolvedValue({ ok: true, datos: null })
})

afterEach(() => {
  renderAsyncMock.mockReset()
  vi.resetAllMocks()
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
  it('lista las plantillas que devuelve el repositorio', async () => {
    montar()

    expect(await screen.findByText('Memoria estándar')).toBeInTheDocument()
    expect(screen.getByText('Cita simple')).toBeInTheDocument()
  })

  /*
    Sin esto, cada visita mostraba "todavía no hay plantillas" durante el
    instante en que la lectura de red todavía no resolvió: el vacío más
    desalentador posible, y falso.
  */
  it('mientras la lectura no resuelve, muestra el esqueleto y no el estado vacío', () => {
    repositorio.listarPlantillas.mockReturnValue(new Promise(() => {}))

    montar()

    expect(screen.getByLabelText('Cargando las plantillas')).toBeInTheDocument()
    expect(screen.queryByText('Todavía no hay plantillas')).not.toBeInTheDocument()
  })

  it('si la lectura falla, lo dice en vez de invitar a crear la primera plantilla', async () => {
    repositorio.listarPlantillas.mockResolvedValue({ ok: false, codigo: 'DATOS_SIN_CONEXION' })

    montar()

    expect(await screen.findByText(/no pudimos conectarnos/i)).toBeInTheDocument()
    expect(screen.queryByText('Todavía no hay plantillas')).not.toBeInTheDocument()
  })

  /*
    La plantilla en blanco salió del camino: el diseño se hace en Word. La
    pantalla solo ofrece subir un .docx, y no debe quedar ningún atajo para
    crear la otra.
  */
  it('solo ofrece subir una plantilla de Word, no crear una en blanco', async () => {
    montar()
    await screen.findByText('Memoria estándar')

    expect(screen.getByRole('button', { name: 'Subir plantilla' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /crear plantilla/i })).not.toBeInTheDocument()
  })

  it('cada plantilla abre su configuración', async () => {
    const usuario = userEvent.setup()
    montar()

    await usuario.click(await screen.findByRole('link', { name: /Cita simple/ }))

    expect(await screen.findByText(`Editor de ${CITA_SIMPLE.id}`)).toBeInTheDocument()
  })

  it('importar un .docx no admitido muestra un error y no sube nada', async () => {
    montar()
    await screen.findByText('Memoria estándar')

    const entrada = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(entrada, { target: { files: [new File(['x'], 'imagen.png', { type: 'image/png' })] } })

    expect(await screen.findByText(/no es un \.docx admitido/i)).toBeInTheDocument()
    expect(repositorio.subirDocxDePlantilla).not.toHaveBeenCalled()
  })

  it('importar el .docx real sube el archivo al bucket y navega al editor de la nueva plantilla', async () => {
    montar()
    await screen.findByText('Memoria estándar')

    const entrada = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(entrada, { target: { files: [archivoDocxReal()] } })

    expect(await screen.findByText(/^Editor de /)).toBeInTheDocument()
    expect(repositorio.subirDocxDePlantilla).toHaveBeenCalledOnce()
    expect(repositorio.crearPlantilla.mock.calls[0]?.[0]).toMatchObject({ origen: 'docx', nombre: 'tem' })
  })

  it('si la subida del .docx falla, lo dice y no crea ninguna plantilla', async () => {
    repositorio.subirDocxDePlantilla.mockResolvedValue({ ok: false, codigo: 'PLANT_DOCX_FALLO_SUBIDA' })
    montar()
    await screen.findByText('Memoria estándar')

    const entrada = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(entrada, { target: { files: [archivoDocxReal()] } })

    expect(await screen.findByText(/no pudimos guardar el archivo de la plantilla/i)).toBeInTheDocument()
    expect(repositorio.crearPlantilla).not.toHaveBeenCalled()
  })

  /*
    Borrar se mudó a la pantalla de la plantilla, detrás de una confirmación
    que dice qué se pierde: desde la galería, un clic de más se llevaba el
    archivo y todas sus memorias sin preguntar.
  */
  it('la galería no borra: borrar vive dentro de la plantilla', async () => {
    montar()
    await screen.findByText('Cita simple')

    expect(screen.queryByRole('button', { name: /eliminar|borrar/i })).not.toBeInTheDocument()
  })

  /*
    Cada tarjeta puede eliminarse, así que quedarse en cero es alcanzable y no
    un caso imposible: sin este vacío la pantalla quedaba en blanco, sin decir
    qué pasó ni por dónde salir.
  */
  it('sin ninguna plantilla, explica cómo se hace una en vez de dejar la lista en blanco', async () => {
    repositorio.listarPlantillas.mockResolvedValue({ ok: true, datos: [] })

    montar()

    expect(await screen.findByText('Tu primera plantilla empieza en Word')).toBeInTheDocument()
    /* La convención de los corchetes es lo único que no se adivina: tiene que estar escrita. */
    expect(screen.getByText('[[Resumen de la tesis]]')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Plantillas' })).not.toBeInTheDocument()
  })

  it('al montar, poda cualquier plantilla en blanco abandonada que haya quedado guardada', async () => {
    const abandonada = crearPlantillaEnBlanco()
    repositorio.listarPlantillas.mockResolvedValue({ ok: true, datos: [abandonada, ESTANDAR] })

    montar()

    expect(await screen.findByText('Memoria estándar')).toBeInTheDocument()
    expect(screen.queryByText('Plantilla sin nombre')).not.toBeInTheDocument()
    expect(repositorio.eliminarPlantilla).toHaveBeenCalledWith(abandonada.id)
  })
})
