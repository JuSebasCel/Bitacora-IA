import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { crearPlantillaDesdeDocx } from '../plantillas'
import type { MarcadorDeDocx, PlantillaDesdeDocx } from '../data'
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

/* La pantalla enlaza de vuelta a /plantillas, así que necesita un router alrededor. */
function montar(plantilla: PlantillaDesdeDocx, props: { alRenombrar?: () => void; alCambiarMarcadores?: () => void } = {}) {
  return render(
    <MemoryRouter>
      <ConfirmacionDePlantillaDocx
        plantilla={plantilla}
        alRenombrar={props.alRenombrar ?? vi.fn()}
        alCambiarMarcadores={props.alCambiarMarcadores ?? vi.fn()}
        alEliminar={vi.fn()}
      />
    </MemoryRouter>,
  )
}

describe('ConfirmacionDePlantillaDocx', () => {
  /*
    Sin marcadores, lo probable es que no se escribieran, no que la app no los
    viera: se explica cómo se escribe uno en vez de solo constatar la ausencia.
  */
  it('sin marcadores, explica cómo se escribe uno', () => {
    montar(crearPlantillaDesdeDocx(ID_DE_PRUEBA, RUTA_DE_PRUEBA, 'Prueba', []))

    expect(screen.getByText(/no encontramos ningún campo/i)).toBeInTheDocument()
    expect(screen.getByText('[[Resumen de la tesis]]')).toBeInTheDocument()
  })

  it('abre el primer hueco sin instrucción, con su marcador resaltado dentro del párrafo', () => {
    montar(crearPlantillaDesdeDocx(ID_DE_PRUEBA, RUTA_DE_PRUEBA, 'Prueba', [MARCADOR_SIMPLE]))

    const resaltado = screen.getByText('[[Nombre grupo]]')
    expect(resaltado.tagName).toBe('MARK')
    expect(screen.getByText(/grupo de investigación:/i)).toBeInTheDocument()
  })

  it('lista las secciones de Word sin pedirles instrucción', () => {
    montar(crearPlantillaDesdeDocx(ID_DE_PRUEBA, RUTA_DE_PRUEBA, 'Prueba', [MARCADOR_CONDICIONAL]))

    expect(screen.getByText('Cita opcional')).toBeInTheDocument()
    expect(screen.getByText(/aparece solo si hay datos/i)).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: /qué debe ir aquí/i })).not.toBeInTheDocument()
  })

  /* El título se edita con doble clic, y entra con todo seleccionado: lo que se teclea lo sustituye. */
  it('con doble clic en el título, lo que se escribe llama a alRenombrar', async () => {
    const alRenombrar = vi.fn()
    montar(crearPlantillaDesdeDocx(ID_DE_PRUEBA, RUTA_DE_PRUEBA, 'Prueba', []), { alRenombrar })

    expect(screen.queryByRole('textbox', { name: 'Nombre de la plantilla' })).not.toBeInTheDocument()
    await userEvent.dblClick(screen.getByRole('button', { name: /Nombre de la plantilla/ }))
    await userEvent.keyboard('X')

    expect(alRenombrar).toHaveBeenLastCalledWith('X')
  })

  /*
    Es lo que esta pantalla existe para hacer: antes era de solo lectura y un
    marcador personalizado salía con texto de ejemplo. La instrucción tiene
    que llegar al marcador que se está editando, y a ningún otro.
  */
  it('la instrucción que se escribe se guarda en su marcador', async () => {
    const alCambiarMarcadores = vi.fn()
    montar(crearPlantillaDesdeDocx(ID_DE_PRUEBA, RUTA_DE_PRUEBA, 'Prueba', [MARCADOR_SIMPLE, MARCADOR_CONDICIONAL]), {
      alCambiarMarcadores,
    })

    await userEvent.type(screen.getByRole('textbox', { name: /qué debe ir aquí/i }), 'R')

    const marcadores = alCambiarMarcadores.mock.lastCall?.[0] as MarcadorDeDocx[]
    expect(marcadores.find((m) => m.id === 'mar-1')).toMatchObject({ instruccion: 'R' })
    expect(marcadores.find((m) => m.id === 'sec-1')).toEqual(MARCADOR_CONDICIONAL)
  })

  it('qué hacer si la conferencia no da material se guarda en el marcador', async () => {
    const alCambiarMarcadores = vi.fn()
    montar(crearPlantillaDesdeDocx(ID_DE_PRUEBA, RUTA_DE_PRUEBA, 'Prueba', [MARCADOR_SIMPLE]), { alCambiarMarcadores })

    await userEvent.click(screen.getByRole('radio', { name: 'Quitar el renglón' }))

    expect(alCambiarMarcadores).toHaveBeenLastCalledWith([expect.objectContaining({ id: 'mar-1', siVacio: 'quitar' })])
  })

  it('una vez que el archivo original baja del bucket, aparece el enlace de descarga', async () => {
    descargarMock.mockResolvedValue({ ok: true, datos: new Blob(['contenido']) })
    renderAsyncMock.mockResolvedValue(undefined)

    montar(crearPlantillaDesdeDocx(ID_DE_PRUEBA, RUTA_DE_PRUEBA, 'Prueba', []))

    const enlace = (await screen.findByText('Descargar el .docx')).closest('a')
    expect(enlace).toHaveAttribute('download', 'Prueba.docx')
  })

  /*
    Que el archivo no baje no invalida la plantilla: sus marcadores viven en la
    fila y se siguen pudiendo configurar. Lo que no puede pasar es quedarse
    callado, con la vista previa vacía insinuando que el documento se perdió.
  */
  it('si el archivo original no se puede descargar, lo dice con nombre propio y conserva los marcadores', async () => {
    descargarMock.mockResolvedValue({ ok: false, codigo: 'PLANT_DOCX_FALLO_DESCARGA' })

    montar(crearPlantillaDesdeDocx(ID_DE_PRUEBA, RUTA_DE_PRUEBA, 'Prueba', [MARCADOR_SIMPLE]))

    expect(await screen.findByText(/no pudimos recuperar el archivo original/i)).toBeInTheDocument()
    expect(screen.getByText('Nombre grupo')).toBeInTheDocument()
    expect(screen.queryByText('Descargar el .docx')).not.toBeInTheDocument()
  })
})
