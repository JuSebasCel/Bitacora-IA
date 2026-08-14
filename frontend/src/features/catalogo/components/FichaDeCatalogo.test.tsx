import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { Conferencia, Ficha } from '@/features/conferencias/data'
import type { FichaDelCatalogo } from '@/features/conferencias/query'
import { FichaDeCatalogo } from './FichaDeCatalogo'

const CONFERENCIA: Conferencia = {
  id: 'cnf-prueba',
  titulo: 'Modelos de lenguaje aplicados a la revisión sistemática de literatura',
  ponente: 'Mariana Escobar Vallejo',
  evento: 'Simposio Andino de Investigación Aplicada',
  codigoDeEvento: 'SAIA-2026-01',
  fechaDelEvento: '2026-03-11',
  duracionEnSegundos: 2890,
  idDueno: '1ba5af9a-f6a2-4504-ab60-1f018c21290a',
  estado: 'procesada',
  idTemaPrincipal: 'tem-modelos-de-lenguaje',
  resumen: 'Resumen de prueba.',
  fuente: 'audio',
  comparticiones: [],
}

const FICHA: Ficha = {
  id: 'fch-prueba',
  idConferencia: CONFERENCIA.id,
  fragmento: 'El dato nunca es neutral: refleja quién decidió qué preguntar.',
  hablante: CONFERENCIA.ponente,
  segundoInicio: 185,
  segundoFin: 210,
  idTema: 'tem-modelos-de-lenguaje',
  tipoDeUnidad: 'cita-textual',
  estadoDeValidacion: 'validada',
  confianzaAutomatica: 0.95,
  contextoMinimo: 'Justo antes de mostrar el diagrama del flujo.',
}

const ENTRADA: FichaDelCatalogo = { ficha: FICHA, conferencia: CONFERENCIA }

/* El nombre del tema llega ya resuelto por prop: la tarjeta no conoce la taxonomía. */
function montar(entrada = ENTRADA, nombreDelTema = 'Modelos de lenguaje') {
  return render(
    <MemoryRouter>
      <FichaDeCatalogo entrada={entrada} nombreDelTema={nombreDelTema} />
    </MemoryRouter>,
  )
}

describe('FichaDeCatalogo', () => {
  it('muestra el fragmento, el tipo de unidad y el tema', () => {
    montar()

    expect(screen.getByText(FICHA.fragmento)).toBeInTheDocument()
    expect(screen.getByText('Cita textual')).toBeInTheDocument()
    /* El tema vive en el encabezado, marcado con su rótulo, no junto a la coordenada del pie. */
    expect(screen.getByText('Tema: Modelos de lenguaje')).toBeInTheDocument()
  })

  it('muestra una insignia con el estado de validación', () => {
    montar()

    expect(screen.getByText('Validada')).toBeInTheDocument()
  })

  it('muestra la coordenada en formato de reloj', () => {
    montar()

    expect(screen.getByText(/00:03:05/)).toBeInTheDocument()
  })

  it('muestra de qué conferencia, ponente y evento viene', () => {
    montar()

    expect(screen.getByText(CONFERENCIA.titulo)).toBeInTheDocument()
    expect(screen.getByText(new RegExp(CONFERENCIA.ponente))).toBeInTheDocument()
    expect(screen.getByText(new RegExp(CONFERENCIA.evento))).toBeInTheDocument()
  })

  /*
    El enlace marca su origen para que el detalle sepa devolver al catálogo y
    no al dashboard, que es a donde mandaba antes a todo el mundo.
  */
  it('enlaza a la conferencia de origen, marcando que se viene del catálogo', () => {
    montar()

    expect(screen.getByRole('link', { name: CONFERENCIA.titulo })).toHaveAttribute(
      'href',
      `/conferencias/${CONFERENCIA.id}?origen=catalogo`,
    )
  })
})
