import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { VistaPreviaDeCarga } from './VistaPreviaDeCarga'

const EVENTOS = [{ id: 'evt-ccdn', nombre: 'Coloquio de Ciencia de Datos del Norte' }]
const PONENTES = [
  { id: 'pon-1', nombre: 'Tomás Iriarte Villalba', idEvento: 'evt-ccdn' },
]

const DATOS_VACIOS = {
  titulo: '',
  idEvento: '',
  idPonente: '',
  fechaDelEvento: '',
  fuente: 'audio' as const,
}

describe('VistaPreviaDeCarga', () => {
  it('sin datos, muestra un texto de marcador de posición para el título', () => {
    render(
      <VistaPreviaDeCarga datos={DATOS_VACIOS} archivo={null} eventos={EVENTOS} ponentes={PONENTES} />,
    )

    expect(screen.getByText(/título de la charla/i)).toBeInTheDocument()
  })

  it('muestra el título escrito', () => {
    render(
      <VistaPreviaDeCarga
        datos={{ ...DATOS_VACIOS, titulo: 'Series de tiempo urbanas' }}
        archivo={null}
        eventos={EVENTOS}
        ponentes={PONENTES}
      />,
    )

    expect(screen.getByText('Series de tiempo urbanas')).toBeInTheDocument()
  })

  it('resuelve el nombre del evento elegido, no su id', () => {
    render(
      <VistaPreviaDeCarga
        datos={{ ...DATOS_VACIOS, idEvento: 'evt-ccdn' }}
        archivo={null}
        eventos={EVENTOS}
        ponentes={PONENTES}
      />,
    )

    expect(screen.getByText('Coloquio de Ciencia de Datos del Norte')).toBeInTheDocument()
    expect(screen.queryByText('evt-ccdn')).not.toBeInTheDocument()
  })

  it('resuelve el nombre del ponente elegido, no su id', () => {
    render(
      <VistaPreviaDeCarga
        datos={{ ...DATOS_VACIOS, idPonente: 'pon-1' }}
        archivo={null}
        eventos={EVENTOS}
        ponentes={PONENTES}
      />,
    )

    expect(screen.getByText('Tomás Iriarte Villalba')).toBeInTheDocument()
  })

  it('muestra la fecha formateada, no la cadena ISO cruda', () => {
    render(
      <VistaPreviaDeCarga
        datos={{ ...DATOS_VACIOS, fechaDelEvento: '2026-05-14' }}
        archivo={null}
        eventos={EVENTOS}
        ponentes={PONENTES}
      />,
    )

    expect(screen.getByText('14 may 2026')).toBeInTheDocument()
    expect(screen.queryByText('2026-05-14')).not.toBeInTheDocument()
  })

  it('muestra el nombre del archivo elegido', () => {
    const archivo = new File([new Uint8Array(1)], 'charla.mp3', { type: 'audio/mpeg' })

    render(
      <VistaPreviaDeCarga datos={DATOS_VACIOS} archivo={archivo} eventos={EVENTOS} ponentes={PONENTES} />,
    )

    expect(screen.getByText(/charla\.mp3/)).toBeInTheDocument()
  })
})
