import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { Tema } from '@/features/taxonomia'
import { CRITERIOS_POR_DEFECTO } from '../filtros'
import type { CriteriosDeCatalogo } from '../filtros'
import { PopoverDeFiltrosDeCatalogo } from './PopoverDeFiltrosDeCatalogo'

/* Los chips muestran el nombre del tema y valen su id, que es lo que viaja al criterio. */
const TEMAS: readonly Tema[] = [
  { id: 'tem-modelos-de-lenguaje', nombre: 'Modelos de lenguaje' },
  { id: 'tem-sesgos-algoritmicos', nombre: 'Sesgos algorítmicos' },
]

/* El panel lleva un enlace a la administración de temas, así que necesita un router alrededor. */
function montar(criterios: CriteriosDeCatalogo = CRITERIOS_POR_DEFECTO, alCambiar = vi.fn()) {
  return render(
    <MemoryRouter>
      <PopoverDeFiltrosDeCatalogo
        criterios={criterios}
        temasDisponibles={TEMAS}
        eventosDisponibles={['Simposio Andino de Investigación Aplicada']}
        alCambiar={alCambiar}
      />
    </MemoryRouter>,
  )
}

describe('PopoverDeFiltrosDeCatalogo', () => {
  it('sin filtros activos, el botón no muestra contador', () => {
    montar()

    expect(screen.getByRole('button', { name: /filtros/i })).toHaveTextContent('Filtros')
  })

  it('con filtros activos, el botón muestra cuántos', () => {
    montar({ ...CRITERIOS_POR_DEFECTO, idTema: 'tem-modelos-de-lenguaje', estado: 'validada' })

    expect(screen.getByRole('button', { name: /filtros/i })).toHaveTextContent('2')
  })

  it('elegir un tema llama a alCambiar con ese tema', async () => {
    const usuario = userEvent.setup()
    const alCambiar = vi.fn()
    montar(CRITERIOS_POR_DEFECTO, alCambiar)

    await usuario.click(screen.getByRole('button', { name: /filtros/i }))
    await usuario.click(screen.getByRole('radio', { name: 'Sesgos algorítmicos' }))

    expect(alCambiar).toHaveBeenCalledWith({ idTema: 'tem-sesgos-algoritmicos' })
  })

  it('volver a "Todos los temas" llama a alCambiar con tema null', async () => {
    const usuario = userEvent.setup()
    const alCambiar = vi.fn()
    montar({ ...CRITERIOS_POR_DEFECTO, idTema: 'tem-modelos-de-lenguaje' }, alCambiar)

    await usuario.click(screen.getByRole('button', { name: /filtros/i }))
    await usuario.click(screen.getByRole('radio', { name: 'Todos los temas' }))

    expect(alCambiar).toHaveBeenCalledWith({ idTema: null })
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
