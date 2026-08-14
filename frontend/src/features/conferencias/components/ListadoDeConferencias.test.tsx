import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { CONFERENCIAS_DE_EJEMPLO } from '../data'
import { conferenciasVisibles } from '../query'
import { ListadoDeConferencias } from './ListadoDeConferencias'
import type { DatosDeFila, EstadoDelListado } from './ListadoDeConferencias'

/*
  Los cuatro estados del listado, probados directamente sobre el componente.

  Es el motivo por el que el estado llega como prop en vez de deducirse dentro:
  desde la pantalla, React vacía el efecto durante el render y el estado de
  carga nunca se llega a observar. Aquí se pueden recorrer los cuatro sin
  simular fallos ni inyectar dependencias.
*/

const VISIBLES = conferenciasVisibles(CONFERENCIAS_DE_EJEMPLO, 'ad474b7c-4a6e-4092-8c7e-ccf8701d9178')

const FILAS: readonly DatosDeFila[] = VISIBLES.map((visible) => ({
  visible,
  etiquetas: [],
  numeroDeFichas: 4,
}))

function montar(estado: EstadoDelListado, filas: readonly DatosDeFila[] = FILAS, extra = {}) {
  return render(
    <MemoryRouter>
      <ListadoDeConferencias
        estado={estado}
        filas={filas}
        segmento="todas"
        busqueda=""
        alQuitarFiltros={() => undefined}
        misEtiquetas={[]}
        alAlternarAsignacion={() => undefined}
        alCrearYAsignar={() => ({ ok: false, mensaje: 'sin usar en esta prueba' })}
        alOcultar={() => undefined}
        {...extra}
      />
    </MemoryRouter>,
  )
}

describe('ListadoDeConferencias', () => {
  it('se anuncia como estado en curso mientras carga', () => {
    montar('cargando', [])

    expect(screen.getByRole('status')).toHaveAccessibleName('Cargando las conferencias')
    expect(screen.queryByRole('list', { name: 'Conferencias' })).not.toBeInTheDocument()
  })

  it('dibuja una fila por conferencia cuando hay datos', () => {
    montar('listo')

    const listado = screen.getByRole('list', { name: 'Conferencias' })

    expect(listado).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(7)
  })

  it('anuncia cuántas conferencias quedan a la vista', () => {
    montar('listo')

    expect(screen.getByText('7 conferencias a la vista')).toBeInTheDocument()
  })

  it('usa el singular cuando solo queda una', () => {
    montar('listo', FILAS.slice(0, 1))

    expect(screen.getByText('1 conferencia a la vista')).toBeInTheDocument()
  })

  /*
    Los dos vacíos mandan a sitios distintos: uno se resuelve cargando una
    conferencia y el otro soltando un filtro. Si dijeran lo mismo, la persona
    iría al lugar equivocado.
  */
  it('explica el vacío por falta de datos según el origen que se esté mirando', () => {
    const { unmount } = montar('vacio-sin-datos', [])

    expect(screen.getByText(/todavía no hay conferencias/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /quitar filtros/i })).not.toBeInTheDocument()
    unmount()

    montar('vacio-sin-datos', [], { segmento: 'compartidas' })

    expect(screen.getByText(/nadie ha compartido/i)).toBeInTheDocument()
  })

  it('ofrece soltar los filtros en el vacío por filtros', async () => {
    const usuario = userEvent.setup()
    const alQuitarFiltros = vi.fn()

    montar('vacio-por-filtros', [], { alQuitarFiltros })

    expect(screen.getByText(/ningún resultado/i)).toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: /quitar filtros/i }))

    expect(alQuitarFiltros).toHaveBeenCalledOnce()
  })

  /*
    La cadena de consulta viaja al enlace del detalle para que volver al listado
    conserve los filtros que había.
  */
  it('lleva los filtros puestos al enlace de cada conferencia', () => {
    montar('listo', FILAS.slice(0, 1), { busqueda: '?segmento=propias' })

    const enlace = screen.getAllByRole('link')[0]

    expect(enlace).toHaveAttribute('href', expect.stringContaining('?segmento=propias'))
  })

  it('ocultar una fila llama a alOcultar con el id de esa conferencia', async () => {
    const usuario = userEvent.setup()
    const alOcultar = vi.fn()
    const primera = FILAS[0]
    if (primera === undefined) throw new Error('se esperaba al menos una fila')

    montar('listo', FILAS.slice(0, 1), { alOcultar })

    await usuario.click(
      screen.getByRole('button', { name: new RegExp(`quitar.*${primera.visible.conferencia.titulo}`, 'i') }),
    )

    expect(alOcultar).toHaveBeenCalledWith(primera.visible.conferencia.id)
  })
})
