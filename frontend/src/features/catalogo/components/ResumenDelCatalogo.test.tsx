import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type {
  Conferencia,
  EstadoDeValidacion,
  Ficha,
  TipoDeUnidad,
} from '@/features/conferencias/data'
import type { FichaDelCatalogo } from '@/features/conferencias/query'
import { ResumenDelCatalogo } from './ResumenDelCatalogo'

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

let contador = 0

function entradaDe(
  tipoDeUnidad: TipoDeUnidad,
  estadoDeValidacion: EstadoDeValidacion,
): FichaDelCatalogo {
  contador += 1

  const ficha: Ficha = {
    id: `fch-prueba-${contador}`,
    idConferencia: CONFERENCIA.id,
    fragmento: 'El dato nunca es neutral: refleja quién decidió qué preguntar.',
    hablante: CONFERENCIA.ponente,
    segundoInicio: 185,
    segundoFin: 210,
    idTema: 'tem-modelos-de-lenguaje',
    tipoDeUnidad,
    estadoDeValidacion,
    confianzaAutomatica: 0.95,
    contextoMinimo: 'Justo antes de mostrar el diagrama del flujo.',
  }

  return { ficha, conferencia: CONFERENCIA }
}

/* Cada cuenta pinta el número junto a su rótulo, así que el rótulo lleva al par completo. */
function cuentaDe(rotulo: string): HTMLElement | null {
  return screen.getByText(rotulo).parentElement
}

describe('ResumenDelCatalogo', () => {
  it('anuncia el total, en singular o en plural según cuántas fichas haya', () => {
    const { unmount } = render(<ResumenDelCatalogo entradas={[entradaDe('metodo', 'validada')]} />)

    expect(screen.getByText('1 ficha a la vista')).toBeInTheDocument()
    unmount()

    render(
      <ResumenDelCatalogo
        entradas={[entradaDe('metodo', 'validada'), entradaDe('postura', 'pendiente')]}
      />,
    )

    expect(screen.getByText('2 fichas a la vista')).toBeInTheDocument()
  })

  it('desglosa las cuentas por estado de validación y por tipo de unidad', () => {
    render(
      <ResumenDelCatalogo
        entradas={[
          entradaDe('metodo', 'validada'),
          entradaDe('metodo', 'validada'),
          entradaDe('postura', 'pendiente'),
        ]}
      />,
    )

    expect(cuentaDe('validadas')).toHaveTextContent('2')
    expect(cuentaDe('pendientes')).toHaveTextContent('1')
    expect(cuentaDe('métodos')).toHaveTextContent('2')
    expect(cuentaDe('posturas')).toHaveTextContent('1')
  })

  /*
    Al revés que `ConteosDeFichas`, donde un cero es información sobre la
    charla ("aquí no se defendió ninguna postura"). En el catálogo el cero es
    solo el resultado de los filtros vigentes: enumerar los seis tipos y los
    tres estados llenaría la tira de ruido que nadie pidió.
  */
  it('omite los estados y los tipos que no tienen ninguna ficha', () => {
    render(<ResumenDelCatalogo entradas={[entradaDe('metodo', 'validada')]} />)

    expect(screen.getByText('métodos')).toBeInTheDocument()
    expect(screen.queryByText('posturas')).not.toBeInTheDocument()
    expect(screen.queryByText('automáticas')).not.toBeInTheDocument()
  })
})
