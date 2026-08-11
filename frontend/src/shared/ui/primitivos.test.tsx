import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EstadoVacio, Esqueleto, Field, Insignia, PanelDeError, Pastilla, Select } from './index'

/*
  Primitivos que estrena F2 y que van a reutilizar F3 a F8. Se prueban juntos
  porque comparten las mismas dos reglas del sistema de diseño, y conviene que
  esas reglas se lean en un solo sitio:

  - el color nunca es el único portador de significado, siempre hay texto;
  - ningún componente usa la variante `dark:`, porque el tema se resuelve con
    variables CSS redefinidas bajo `prefers-color-scheme`.
*/

const OPCIONES = [
  { valor: 'todas', texto: 'Todas' },
  { valor: 'propias', texto: 'Mías' },
  { valor: 'compartidas', texto: 'Compartidas conmigo' },
]

describe('Select', () => {
  it('renderiza cada opción con su texto', () => {
    render(<Select aria-label="Origen" opciones={OPCIONES} defaultValue="todas" />)

    expect(screen.getAllByRole('option')).toHaveLength(3)
    expect(screen.getByRole('option', { name: 'Compartidas conmigo' })).toBeInTheDocument()
  })

  /*
    Field resuelve la relación etiqueta/control clonando al hijo. Select tiene
    que aceptar esa inyección igual que Input, o el rótulo apuntaría a un id
    que no existe.
  */
  it('recibe de Field el identificador, la etiqueta y la descripción', () => {
    render(
      <Field id="origen" etiqueta="Origen" ayuda="Filtra por quién cargó la conferencia">
        <Select opciones={OPCIONES} defaultValue="todas" />
      </Field>,
    )

    const control = screen.getByLabelText('Origen')

    expect(control).toHaveAttribute('id', 'origen')
    expect(control).toHaveAccessibleDescription('Filtra por quién cargó la conferencia')
  })

  it('se marca como inválido cuando Field le pasa un error', () => {
    render(
      <Field id="origen" etiqueta="Origen" error="Elige un origen">
        <Select opciones={OPCIONES} defaultValue="todas" />
      </Field>,
    )

    expect(screen.getByLabelText('Origen')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent('Elige un origen')
  })

  it('respeta el estado deshabilitado', () => {
    render(<Select aria-label="Origen" opciones={OPCIONES} defaultValue="todas" disabled />)

    expect(screen.getByLabelText('Origen')).toBeDisabled()
  })
})

describe('Insignia', () => {
  it('acompaña siempre el color con texto legible', () => {
    render(<Insignia tono="validado">Validada</Insignia>)

    expect(screen.getByText('Validada')).toBeInTheDocument()
  })

  it('usa el token semántico que corresponde a cada tono', () => {
    const tonos = [
      { tono: 'validado', clase: 'validado' },
      { tono: 'pendiente', clase: 'pendiente' },
      { tono: 'automatico', clase: 'automatico' },
      { tono: 'error', clase: 'error' },
    ] as const

    for (const { tono, clase } of tonos) {
      const { unmount } = render(<Insignia tono={tono}>Estado</Insignia>)

      expect(screen.getByText('Estado').className).toContain(clase)
      unmount()
    }
  })

  it('no recurre a la variante dark de Tailwind', () => {
    render(<Insignia tono="pendiente">Pendiente de revisión</Insignia>)

    expect(screen.getByText('Pendiente de revisión').className).not.toContain('dark:')
  })
})

describe('Pastilla', () => {
  it('muestra el nombre de la etiqueta', () => {
    render(<Pastilla nombre="art1" />)

    expect(screen.getByText('art1')).toBeInTheDocument()
  })

  /*
    Sin `alQuitar` la pastilla es estática. Es el caso de una etiqueta que puso
    quien compartió la conferencia: se ve, no se quita.
  */
  it('no ofrece control de quitar cuando no se le da qué hacer al quitarla', () => {
    render(<Pastilla nombre="IA" />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  /*
    Dos personas pueden tener una etiqueta con el mismo nombre sobre la misma
    conferencia. Sin distinguirlas, la fila muestra dos pastillas idénticas y se
    lee como un error de pintado. Lo detectó la revisión visual, no la suite.
  */
  it('distingue la etiqueta de otra persona de la propia', () => {
    const { unmount } = render(<Pastilla nombre="IA" />)
    expect(screen.getByText('IA').className).not.toContain('border-dashed')
    unmount()

    render(<Pastilla nombre="IA" ajena />)
    const ajena = screen.getByText('IA')

    expect(ajena.className).toContain('border-dashed')
    expect(ajena).toHaveAttribute('title', expect.stringMatching(/compartió/i))
  })

  it('ofrece un control de quitar con nombre accesible propio', async () => {
    const usuario = userEvent.setup()
    const alQuitar = vi.fn()

    render(<Pastilla nombre="art1" alQuitar={alQuitar} />)

    const boton = screen.getByRole('button', { name: /quitar.*art1/i })
    await usuario.click(boton)

    expect(alQuitar).toHaveBeenCalledOnce()
  })
})

describe('EstadoVacio', () => {
  it('explica qué falta y por qué', () => {
    render(
      <EstadoVacio
        titulo="No hay conferencias todavía"
        descripcion="Carga la primera para verla aquí con sus fichas."
      />,
    )

    expect(screen.getByText('No hay conferencias todavía')).toBeInTheDocument()
    expect(screen.getByText(/carga la primera/i)).toBeInTheDocument()
  })

  it('acomoda una salida cuando la hay', () => {
    render(
      <EstadoVacio titulo="Sin resultados" descripcion="Ningún filtro deja pasar nada.">
        <button type="button">Quitar filtros</button>
      </EstadoVacio>,
    )

    expect(screen.getByRole('button', { name: 'Quitar filtros' })).toBeInTheDocument()
  })
})

describe('Esqueleto', () => {
  it('se anuncia como estado en curso, con texto para quien no ve la animación', () => {
    render(<Esqueleto filas={3} etiqueta="Cargando las conferencias" />)

    const estado = screen.getByRole('status')

    expect(estado).toHaveAccessibleName('Cargando las conferencias')
  })
})

describe('PanelDeError', () => {
  it('se anuncia como alerta con el mensaje ya traducido', () => {
    render(<PanelDeError mensaje="No encontramos esa conferencia." />)

    const alerta = screen.getByRole('alert')

    expect(alerta).toHaveTextContent('No encontramos esa conferencia.')
  })

  /*
    Recibe el mensaje ya resuelto por `mensajeDeError`. No conoce los códigos,
    justamente para que no pueda filtrar uno a la pantalla por descuido.
  */
  it('muestra exactamente el texto que recibe, sin añadir detalle técnico', () => {
    render(<PanelDeError mensaje="No encontramos esa conferencia." />)

    expect(screen.getByRole('alert').textContent).toBe('No encontramos esa conferencia.')
  })

  it('acomoda una acción de reintento cuando la hay', () => {
    render(
      <PanelDeError mensaje="El procesamiento se interrumpió.">
        <button type="button">Volver al listado</button>
      </PanelDeError>,
    )

    expect(screen.getByRole('button', { name: 'Volver al listado' })).toBeInTheDocument()
  })
})
