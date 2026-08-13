import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Tema } from '@/features/taxonomia'
import type { Ficha } from '../data'
import { ListadoDeFichas } from './ListadoDeFichas'

/*
  Lo que se prueba aquí es el vacío, porque el listado con fichas ya se
  recorre entero desde `PantallaDetalleConferencia.test.tsx` con datos reales
  del fixture. El vacío, en cambio, no es alcanzable desde ahí: ninguna
  conferencia procesada del fixture se quedó sin fichas.
*/

const FICHA: Ficha = {
  id: 'fch-prueba',
  idConferencia: 'cnf-prueba',
  fragmento: 'El dato nunca es neutral: refleja quién decidió qué preguntar.',
  hablante: 'Mariana Escobar Vallejo',
  segundoInicio: 185,
  segundoFin: 210,
  idTema: 'tem-modelos-de-lenguaje',
  tipoDeUnidad: 'cita-textual',
  estadoDeValidacion: 'validada',
  confianzaAutomatica: 0.95,
  contextoMinimo: 'Justo antes de mostrar el diagrama del flujo.',
}

/* La ficha guarda el id del tema, así que el listado necesita el pool para nombrarlo. */
const TEMAS: readonly Tema[] = [{ id: 'tem-modelos-de-lenguaje', nombre: 'Modelos de lenguaje' }]

describe('ListadoDeFichas', () => {
  it('lista cada ficha con su coordenada y su estado', () => {
    render(<ListadoDeFichas fichas={[FICHA]} temas={TEMAS} />)

    expect(screen.getByRole('listitem')).toHaveTextContent('00:03:05')
    expect(screen.getByText('Validada')).toBeInTheDocument()
  })
})

/*
  Cero fichas no siempre significa lo mismo, y decir lo mismo en los dos casos
  manda a la persona a una conclusión equivocada: en una conferencia ajena que
  solo muestra lo validado, el vacío no dice que la charla no produjera nada,
  sino que lo que produjo sigue en revisión y su dueño eligió no compartirlo.
*/
describe('ListadoDeFichas, sin ninguna ficha', () => {
  it('atribuye el vacío al procesamiento cuando se ve todo', () => {
    render(<ListadoDeFichas fichas={[]} temas={TEMAS} ocultaPendientes={false} />)

    expect(screen.getByText(/terminó sin extraer ninguna ficha/i)).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('atribuye el vacío a la privacidad de la compartición cuando oculta las pendientes', () => {
    render(<ListadoDeFichas fichas={[]} temas={TEMAS} ocultaPendientes />)

    expect(screen.getByText(/solo las ya revisadas/i)).toBeInTheDocument()
    expect(screen.queryByText(/terminó sin extraer ninguna ficha/i)).not.toBeInTheDocument()
  })
})
