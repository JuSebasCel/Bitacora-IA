import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SegmentacionDeFuente } from './SegmentacionDeFuente'

describe('SegmentacionDeFuente', () => {
  it('marca la fuente activa como seleccionada', () => {
    render(<SegmentacionDeFuente fuente="audio" alCambiar={() => undefined} />)

    expect(screen.getByRole('radio', { name: 'Audio' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Transcripción' })).not.toBeChecked()
  })

  it('cambiar a Transcripción llama a alCambiar con "transcripcion"', async () => {
    const usuario = userEvent.setup()
    const alCambiar = vi.fn()
    render(<SegmentacionDeFuente fuente="audio" alCambiar={alCambiar} />)

    await usuario.click(screen.getByRole('radio', { name: 'Transcripción' }))

    expect(alCambiar).toHaveBeenCalledWith('transcripcion')
  })

  it('cambiar a Audio llama a alCambiar con "audio"', async () => {
    const usuario = userEvent.setup()
    const alCambiar = vi.fn()
    render(<SegmentacionDeFuente fuente="transcripcion" alCambiar={alCambiar} />)

    await usuario.click(screen.getByRole('radio', { name: 'Audio' }))

    expect(alCambiar).toHaveBeenCalledWith('audio')
  })

  it('tiene una leyenda accesible para el grupo', () => {
    render(<SegmentacionDeFuente fuente="audio" alCambiar={() => undefined} />)

    expect(screen.getByRole('group', { name: /fuente/i })).toBeInTheDocument()
  })
})
