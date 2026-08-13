import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CRITERIOS_POR_DEFECTO } from '../filtros'
import type { CriteriosDeCatalogo } from '../filtros'
import { PopoverDeFiltrosDeCatalogo } from './PopoverDeFiltrosDeCatalogo'

function montar(criterios: CriteriosDeCatalogo = CRITERIOS_POR_DEFECTO, alCambiar = vi.fn()) {
  return render(
    <PopoverDeFiltrosDeCatalogo
      criterios={criterios}
      temasDisponibles={['Modelos de lenguaje', 'Sesgos algorítmicos']}
      eventosDisponibles={['Simposio Andino de Investigación Aplicada']}
      alCambiar={alCambiar}
    />,
  )
}

describe('PopoverDeFiltrosDeCatalogo', () => {
  it('sin filtros activos, el botón no muestra contador', () => {
    montar()

    expect(screen.getByRole('button', { name: /filtros/i })).toHaveTextContent('Filtros')
  })

  it('con filtros activos, el botón muestra cuántos', () => {
    montar({ ...CRITERIOS_POR_DEFECTO, tema: 'Modelos de lenguaje', estado: 'validada' })

    expect(screen.getByRole('button', { name: /filtros/i })).toHaveTextContent('2')
  })

  it('elegir un tema llama a alCambiar con ese tema', async () => {
    const usuario = userEvent.setup()
    const alCambiar = vi.fn()
    montar(CRITERIOS_POR_DEFECTO, alCambiar)

    await usuario.click(screen.getByRole('button', { name: /filtros/i }))
    await usuario.click(screen.getByRole('radio', { name: 'Sesgos algorítmicos' }))

    expect(alCambiar).toHaveBeenCalledWith({ tema: 'Sesgos algorítmicos' })
  })

  it('volver a "Todos los temas" llama a alCambiar con tema null', async () => {
    const usuario = userEvent.setup()
    const alCambiar = vi.fn()
    montar({ ...CRITERIOS_POR_DEFECTO, tema: 'Modelos de lenguaje' }, alCambiar)

    await usuario.click(screen.getByRole('button', { name: /filtros/i }))
    await usuario.click(screen.getByRole('radio', { name: 'Todos los temas' }))

    expect(alCambiar).toHaveBeenCalledWith({ tema: null })
  })

  it('elegir un tipo de unidad llama a alCambiar con ese tipo', async () => {
    const usuario = userEvent.setup()
    const alCambiar = vi.fn()
    montar(CRITERIOS_POR_DEFECTO, alCambiar)

    await usuario.click(screen.getByRole('button', { name: /filtros/i }))
    await usuario.click(screen.getByRole('radio', { name: 'Cita textual' }))

    expect(alCambiar).toHaveBeenCalledWith({ tipoDeUnidad: 'cita-textual' })
  })

  it('elegir un evento llama a alCambiar con ese evento', async () => {
    const usuario = userEvent.setup()
    const alCambiar = vi.fn()
    montar(CRITERIOS_POR_DEFECTO, alCambiar)

    await usuario.click(screen.getByRole('button', { name: /filtros/i }))
    await usuario.click(screen.getByRole('radio', { name: 'Simposio Andino de Investigación Aplicada' }))

    expect(alCambiar).toHaveBeenCalledWith({ evento: 'Simposio Andino de Investigación Aplicada' })
  })

  it('elegir un estado llama a alCambiar con ese estado', async () => {
    const usuario = userEvent.setup()
    const alCambiar = vi.fn()
    montar(CRITERIOS_POR_DEFECTO, alCambiar)

    await usuario.click(screen.getByRole('button', { name: /filtros/i }))
    await usuario.click(screen.getByRole('radio', { name: 'Validada' }))

    expect(alCambiar).toHaveBeenCalledWith({ estado: 'validada' })
  })
})
