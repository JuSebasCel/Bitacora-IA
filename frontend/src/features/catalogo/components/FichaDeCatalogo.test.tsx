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
  idDueno: 'usr-alcantara',
  estado: 'procesada',
  temaPrincipal: 'Modelos de lenguaje',
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
  tema: 'Modelos de lenguaje',
  tipoDeUnidad: 'cita-textual',
  estadoDeValidacion: 'validada',
  confianzaAutomatica: 0.95,
  contextoMinimo: 'Justo antes de mostrar el diagrama del flujo.',
}

const ENTRADA: FichaDelCatalogo = { ficha: FICHA, conferencia: CONFERENCIA }

function montar(entrada = ENTRADA) {
  return render(
    <MemoryRouter>
      <FichaDeCatalogo entrada={entrada} />
    </MemoryRouter>,
  )
}

describe('FichaDeCatalogo', () => {
  it('muestra el fragmento, el tipo de unidad y el tema', () => {
    montar()

    expect(screen.getByText(FICHA.fragmento)).toBeInTheDocument()
    expect(screen.getByText('Cita textual')).toBeInTheDocument()
    /*
      Tema y coordenada comparten el párrafo del pie. Se busca la cadena
      completa porque el título de la conferencia de este fixture también
      empieza por el nombre del tema.
    */
    expect(screen.getByText(/Modelos de lenguaje · 00:03:05/)).toBeInTheDocument()
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
