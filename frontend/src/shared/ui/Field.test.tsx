import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Field } from './Field'
import { Input } from './Input'

describe('Field', () => {
  it('asocia la etiqueta al control', () => {
    render(
      <Field id="correo" etiqueta="Correo electronico">
        <Input />
      </Field>,
    )

    const campo = screen.getByLabelText('Correo electronico')
    expect(campo).toBe(document.getElementById('correo'))
    expect(campo.tagName).toBe('INPUT')
  })

  it('muestra el error debajo del control, con role alert, y lo asocia por aria-describedby', () => {
    render(
      <Field id="correo" etiqueta="Correo electronico" error="El correo no es valido">
        <Input />
      </Field>,
    )

    const campo = screen.getByLabelText('Correo electronico')
    const error = screen.getByRole('alert')

    expect(error).toHaveTextContent('El correo no es valido')
    expect(campo.getAttribute('aria-describedby')?.split(' ')).toContain('correo-error')
    expect(error).toHaveAttribute('id', 'correo-error')

    const posicion = campo.compareDocumentPosition(error)
    expect(posicion & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('sin error no renderiza el nodo de error', () => {
    render(
      <Field id="correo" etiqueta="Correo electronico">
        <Input />
      </Field>,
    )

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(document.getElementById('correo-error')).toBeNull()
    expect(screen.getByLabelText('Correo electronico')).not.toHaveAttribute('aria-describedby')
  })

  it('asocia el texto de ayuda por aria-describedby', () => {
    render(
      <Field id="clave" etiqueta="Contrasena" ayuda="Minimo 12 caracteres">
        <Input type="password" />
      </Field>,
    )

    const campo = document.getElementById('clave')
    expect(campo).not.toBeNull()
    expect(campo?.getAttribute('aria-describedby')?.split(' ')).toContain('clave-ayuda')
    expect(screen.getByText('Minimo 12 caracteres')).toHaveAttribute('id', 'clave-ayuda')
  })

  it('con error marca el control como invalido', () => {
    render(
      <Field id="correo" etiqueta="Correo" error="No es valido">
        <Input />
      </Field>,
    )

    expect(screen.getByLabelText('Correo')).toHaveAttribute('aria-invalid', 'true')
  })

  it('sin error no marca el control como invalido', () => {
    render(
      <Field id="correo" etiqueta="Correo">
        <Input />
      </Field>,
    )

    expect(screen.getByLabelText('Correo')).not.toHaveAttribute('aria-invalid', 'true')
  })

  it('respeta el invalido explicito del hijo', () => {
    render(
      <Field id="correo" etiqueta="Correo" error="No es valido">
        <Input invalido={false} />
      </Field>,
    )

    expect(screen.getByLabelText('Correo')).not.toHaveAttribute('aria-invalid', 'true')
  })

  it('cuando el hijo trae su propio id, la etiqueta apunta a ese id', async () => {
    render(
      <Field id="a" etiqueta="Correo" ayuda="Usa tu correo de trabajo" error="No es valido">
        <Input id="b" />
      </Field>,
    )

    const campo = screen.getByLabelText('Correo')
    expect(campo).toBe(document.getElementById('b'))

    const descripciones = campo.getAttribute('aria-describedby')?.split(' ')
    expect(descripciones).toContain('b-ayuda')
    expect(descripciones).toContain('b-error')
    expect(screen.getByRole('alert')).toHaveAttribute('id', 'b-error')
    expect(screen.getByText('Usa tu correo de trabajo')).toHaveAttribute('id', 'b-ayuda')

    await userEvent.click(screen.getByText('Correo'))
    expect(campo).toHaveFocus()
  })

  it('asocia ayuda y error a la vez', () => {
    render(
      <Field id="clave" etiqueta="Contrasena" ayuda="Minimo 12 caracteres" error="Muy corta">
        <Input type="password" />
      </Field>,
    )

    const descripciones = document
      .getElementById('clave')
      ?.getAttribute('aria-describedby')
      ?.split(' ')
    expect(descripciones).toContain('clave-ayuda')
    expect(descripciones).toContain('clave-error')
  })
})
