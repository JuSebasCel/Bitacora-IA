import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LienzoDePlantilla } from './LienzoDePlantilla'
import type { ElementoDePlantilla } from '../data'

const ELEMENTOS: readonly ElementoDePlantilla[] = [
  {
    id: 'el-uno',
    tipo: 'texto',
    rol: 'cuerpo',
    contenido: 'Primer elemento',
    posicion: { x: 0.1, y: 0.1, ancho: 0.3, alto: 0.1 },
  },
  {
    id: 'el-dos',
    tipo: 'texto',
    rol: 'cuerpo',
    contenido: 'Segundo elemento',
    posicion: { x: 0.5, y: 0.5, ancho: 0.3, alto: 0.1 },
  },
]

describe('LienzoDePlantilla', () => {
  it('dibuja un elemento por cada entrada', () => {
    render(<LienzoDePlantilla elementos={ELEMENTOS} />)

    expect(screen.getByText('Primer elemento')).toBeInTheDocument()
    expect(screen.getByText('Segundo elemento')).toBeInTheDocument()
  })

  it('al hacer click en un elemento, lo selecciona', () => {
    const alSeleccionar = vi.fn()
    render(<LienzoDePlantilla elementos={ELEMENTOS} alSeleccionar={alSeleccionar} />)

    fireEvent.pointerDown(screen.getByTestId('elemento-el-uno'))

    expect(alSeleccionar).toHaveBeenCalledWith('el-uno')
  })

  it('al hacer click en el fondo del lienzo, deselecciona', () => {
    const alSeleccionar = vi.fn()
    render(
      <LienzoDePlantilla
        elementos={ELEMENTOS}
        idSeleccionado="el-uno"
        alSeleccionar={alSeleccionar}
      />,
    )

    fireEvent.click(screen.getByTestId('lienzo-de-plantilla'))

    expect(alSeleccionar).toHaveBeenCalledWith(null)
  })

  it('marca como seleccionado solo el elemento cuyo id coincide', () => {
    render(<LienzoDePlantilla elementos={ELEMENTOS} idSeleccionado="el-dos" />)

    expect(screen.getByTestId('elemento-el-uno').className).not.toContain('outline-acento')
    expect(screen.getByTestId('elemento-el-dos').className).toContain('outline-acento')
  })

  it('en modo no interactivo, el fondo no responde al click', () => {
    const alSeleccionar = vi.fn()
    render(
      <LienzoDePlantilla elementos={ELEMENTOS} interactivo={false} alSeleccionar={alSeleccionar} />,
    )

    fireEvent.click(screen.getByTestId('lienzo-de-plantilla'))

    expect(alSeleccionar).not.toHaveBeenCalled()
  })

  it('en modo no interactivo, ningún elemento se muestra como seleccionado', () => {
    render(
      <LienzoDePlantilla elementos={ELEMENTOS} interactivo={false} idSeleccionado="el-uno" />,
    )

    expect(screen.getByTestId('elemento-el-uno').className).not.toContain('outline-acento')
  })
})
