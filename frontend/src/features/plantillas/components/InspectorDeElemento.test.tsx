import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { InspectorDeElemento } from './InspectorDeElemento'
import type { ElementoDePlantilla } from '../data'

const TEXTO: ElementoDePlantilla = {
  id: 'el-texto',
  tipo: 'texto',
  rol: 'cuerpo',
  contenido: 'Hola',
  posicion: { x: 0.1, y: 0.1, ancho: 0.3, alto: 0.1 },
}

const IMAGEN: ElementoDePlantilla = {
  id: 'el-imagen',
  tipo: 'imagen',
  url: 'data:image/png;base64,AAAA',
  nombreDeArchivo: 'logo.png',
  posicion: { x: 0.1, y: 0.1, ancho: 0.2, alto: 0.2 },
}

const MARCADOR: ElementoDePlantilla = {
  id: 'el-marcador',
  tipo: 'marcador',
  campo: 'tema_principal',
  formato: 'parrafo',
  posicion: { x: 0.1, y: 0.1, ancho: 0.3, alto: 0.1 },
}

describe('InspectorDeElemento — sin selección', () => {
  it('invita a elegir un elemento', () => {
    render(<InspectorDeElemento elemento={null} alActualizar={vi.fn()} alQuitar={vi.fn()} />)

    expect(screen.getByText(/elige un elemento/i)).toBeInTheDocument()
  })
})

describe('InspectorDeElemento — texto', () => {
  it('muestra el tamaño y el contenido actuales', () => {
    render(<InspectorDeElemento elemento={TEXTO} alActualizar={vi.fn()} alQuitar={vi.fn()} />)

    expect(screen.getByLabelText(/tamaño/i)).toHaveValue('cuerpo')
    expect(screen.getByLabelText(/contenido/i)).toHaveValue('Hola')
  })

  it('cambiar el tamaño llama a alActualizar con el nuevo rol', async () => {
    const usuario = userEvent.setup()
    const alActualizar = vi.fn()
    render(<InspectorDeElemento elemento={TEXTO} alActualizar={alActualizar} alQuitar={vi.fn()} />)

    await usuario.selectOptions(screen.getByLabelText(/tamaño/i), 'titulo')

    expect(alActualizar).toHaveBeenCalledWith({ rol: 'titulo' })
  })

  it('escribir en el contenido llama a alActualizar con el nuevo texto', async () => {
    const usuario = userEvent.setup()
    const alActualizar = vi.fn()
    render(<InspectorDeElemento elemento={TEXTO} alActualizar={alActualizar} alQuitar={vi.fn()} />)

    await usuario.type(screen.getByLabelText(/contenido/i), '!')

    expect(alActualizar).toHaveBeenCalledWith({ contenido: 'Hola!' })
  })
})

describe('InspectorDeElemento — imagen', () => {
  it('muestra el nombre del archivo', () => {
    render(<InspectorDeElemento elemento={IMAGEN} alActualizar={vi.fn()} alQuitar={vi.fn()} />)

    expect(screen.getByText('logo.png')).toBeInTheDocument()
  })
})

describe('InspectorDeElemento — marcador', () => {
  it('muestra el campo y el formato actuales', () => {
    render(<InspectorDeElemento elemento={MARCADOR} alActualizar={vi.fn()} alQuitar={vi.fn()} />)

    expect(screen.getByLabelText(/campo/i)).toHaveValue('tema_principal')
    expect(screen.getByLabelText(/formato/i)).toHaveValue('parrafo')
  })

  it('cambiar el campo llama a alActualizar con el nuevo campo', async () => {
    const usuario = userEvent.setup()
    const alActualizar = vi.fn()
    render(<InspectorDeElemento elemento={MARCADOR} alActualizar={alActualizar} alQuitar={vi.fn()} />)

    await usuario.selectOptions(screen.getByLabelText(/campo/i), 'nombre_ponente')

    expect(alActualizar).toHaveBeenCalledWith({ campo: 'nombre_ponente' })
  })

  it('cambiar el formato llama a alActualizar con el nuevo formato', async () => {
    const usuario = userEvent.setup()
    const alActualizar = vi.fn()
    render(<InspectorDeElemento elemento={MARCADOR} alActualizar={alActualizar} alQuitar={vi.fn()} />)

    await usuario.selectOptions(screen.getByLabelText(/formato/i), 'lista')

    expect(alActualizar).toHaveBeenCalledWith({ formato: 'lista' })
  })
})

describe('InspectorDeElemento — eliminar', () => {
  it('el botón Quitar elemento llama a alQuitar', async () => {
    const usuario = userEvent.setup()
    const alQuitar = vi.fn()
    render(<InspectorDeElemento elemento={TEXTO} alActualizar={vi.fn()} alQuitar={alQuitar} />)

    await usuario.click(screen.getByRole('button', { name: /quitar elemento/i }))

    expect(alQuitar).toHaveBeenCalled()
  })

  it('la tecla Delete con un elemento elegido y el foco fuera de un campo llama a alQuitar', async () => {
    const usuario = userEvent.setup()
    const alQuitar = vi.fn()
    render(<InspectorDeElemento elemento={TEXTO} alActualizar={vi.fn()} alQuitar={alQuitar} />)

    document.body.focus()
    await usuario.keyboard('{Delete}')

    expect(alQuitar).toHaveBeenCalled()
  })

  it('la tecla Delete con el foco dentro de un campo de texto no llama a alQuitar', async () => {
    const usuario = userEvent.setup()
    const alQuitar = vi.fn()
    render(<InspectorDeElemento elemento={TEXTO} alActualizar={vi.fn()} alQuitar={alQuitar} />)

    await usuario.click(screen.getByLabelText(/contenido/i))
    await usuario.keyboard('{Delete}')

    expect(alQuitar).not.toHaveBeenCalled()
  })

  it('sin elemento elegido, la tecla Delete no hace nada', async () => {
    const usuario = userEvent.setup()
    const alQuitar = vi.fn()
    render(<InspectorDeElemento elemento={null} alActualizar={vi.fn()} alQuitar={alQuitar} />)

    await usuario.keyboard('{Delete}')

    expect(alQuitar).not.toHaveBeenCalled()
  })
})
