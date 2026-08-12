import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ElementoEnLienzo } from './ElementoEnLienzo'
import type { ElementoDePlantilla } from '../data'

const TEXTO: ElementoDePlantilla = {
  id: 'el-texto',
  tipo: 'texto',
  rol: 'titulo',
  contenido: 'Memoria del evento',
  posicion: { x: 0.1, y: 0.1, ancho: 0.4, alto: 0.1 },
}

const IMAGEN: ElementoDePlantilla = {
  id: 'el-imagen',
  tipo: 'imagen',
  url: 'data:image/png;base64,AAAA',
  nombreDeArchivo: 'logo.png',
  posicion: { x: 0.1, y: 0.1, ancho: 0.2, alto: 0.2 },
}

const MARCADOR_PARRAFO: ElementoDePlantilla = {
  id: 'el-marcador-parrafo',
  tipo: 'marcador',
  campo: 'tema_principal',
  formato: 'parrafo',
  posicion: { x: 0.1, y: 0.1, ancho: 0.5, alto: 0.15 },
}

const MARCADOR_LISTA: ElementoDePlantilla = {
  id: 'el-marcador-lista',
  tipo: 'marcador',
  campo: 'resumen_metodo',
  formato: 'lista',
  posicion: { x: 0.1, y: 0.1, ancho: 0.5, alto: 0.3 },
}

function noop(): void {
  /* sin-op para props obligatorias que esta prueba no ejercita */
}

describe('ElementoEnLienzo — texto', () => {
  it('muestra el contenido con la clase correspondiente a su rol', () => {
    render(
      <ElementoEnLienzo
        elemento={TEXTO}
        interactivo
        seleccionado={false}
        onPointerDownCuerpo={noop}
        onPointerDownMango={noop}
      />,
    )

    expect(screen.getByText('Memoria del evento')).toBeInTheDocument()
  })

  it('sin contenido, muestra un marcador de posición atenuado', () => {
    render(
      <ElementoEnLienzo
        elemento={{ ...TEXTO, contenido: '' }}
        interactivo
        seleccionado={false}
        onPointerDownCuerpo={noop}
        onPointerDownMango={noop}
      />,
    )

    expect(screen.getByText(/texto/i)).toBeInTheDocument()
  })
})

describe('ElementoEnLienzo — imagen', () => {
  it('muestra la imagen con su nombre de archivo como texto alternativo', () => {
    render(
      <ElementoEnLienzo
        elemento={IMAGEN}
        interactivo
        seleccionado={false}
        onPointerDownCuerpo={noop}
        onPointerDownMango={noop}
      />,
    )

    expect(screen.getByRole('img', { name: 'logo.png' })).toHaveAttribute(
      'src',
      'data:image/png;base64,AAAA',
    )
  })
})

describe('ElementoEnLienzo — marcador', () => {
  it('formato párrafo resuelve al texto de ejemplo', () => {
    render(
      <ElementoEnLienzo
        elemento={MARCADOR_PARRAFO}
        interactivo
        seleccionado={false}
        onPointerDownCuerpo={noop}
        onPointerDownMango={noop}
      />,
    )

    expect(
      screen.getByText('Sesgos algorítmicos en modelos de predicción aplicados a políticas públicas.'),
    ).toBeInTheDocument()
  })

  it('formato lista resuelve a una lista de elementos de ejemplo', () => {
    render(
      <ElementoEnLienzo
        elemento={MARCADOR_LISTA}
        interactivo
        seleccionado={false}
        onPointerDownCuerpo={noop}
        onPointerDownMango={noop}
      />,
    )

    expect(screen.getByRole('list')).toBeInTheDocument()
    expect(screen.getByText('Entrevistas semiestructuradas')).toBeInTheDocument()
  })
})

describe('ElementoEnLienzo — selección e interacción', () => {
  it('llama a onPointerDownCuerpo al presionar sobre el elemento, en modo interactivo', () => {
    const alPresionar = vi.fn()
    render(
      <ElementoEnLienzo
        elemento={TEXTO}
        interactivo
        seleccionado={false}
        onPointerDownCuerpo={alPresionar}
        onPointerDownMango={noop}
      />,
    )

    screen.getByTestId('elemento-el-texto').dispatchEvent(
      new Event('pointerdown', { bubbles: true }),
    )

    expect(alPresionar).toHaveBeenCalled()
  })

  it('no interactivo, no responde a pointerdown', () => {
    const alPresionar = vi.fn()
    render(
      <ElementoEnLienzo
        elemento={TEXTO}
        interactivo={false}
        seleccionado={false}
        onPointerDownCuerpo={alPresionar}
        onPointerDownMango={noop}
      />,
    )

    screen.getByTestId('elemento-el-texto').dispatchEvent(
      new Event('pointerdown', { bubbles: true }),
    )

    expect(alPresionar).not.toHaveBeenCalled()
  })

  it('seleccionado y interactivo, muestra el mango de redimensionar', () => {
    render(
      <ElementoEnLienzo
        elemento={TEXTO}
        interactivo
        seleccionado
        onPointerDownCuerpo={noop}
        onPointerDownMango={noop}
      />,
    )

    expect(screen.getByRole('button', { name: /redimensionar/i })).toBeInTheDocument()
  })

  it('no seleccionado, no muestra el mango de redimensionar', () => {
    render(
      <ElementoEnLienzo
        elemento={TEXTO}
        interactivo
        seleccionado={false}
        onPointerDownCuerpo={noop}
        onPointerDownMango={noop}
      />,
    )

    expect(screen.queryByRole('button', { name: /redimensionar/i })).not.toBeInTheDocument()
  })
})
