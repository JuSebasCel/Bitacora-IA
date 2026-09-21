import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Input } from './Input'

describe('Input', () => {
  it('con invalido expone aria-invalid true', () => {
    render(<Input invalido aria-label="Correo" />)

    expect(screen.getByLabelText('Correo')).toHaveAttribute('aria-invalid', 'true')
  })

  it('sin invalido no marca el control como invalido', () => {
    render(<Input aria-label="Correo" />)

    expect(screen.getByLabelText('Correo')).not.toHaveAttribute('aria-invalid', 'true')
  })

  it('reenvia props nativas, conserva el className adicional y acepta escritura', async () => {
    render(<Input aria-label="Correo" type="email" name="correo" className="w-full" />)

    const campo = screen.getByLabelText('Correo')
    await userEvent.type(campo, 'ana@bitacora.ai')

    expect(campo).toHaveAttribute('type', 'email')
    expect(campo).toHaveAttribute('name', 'correo')
    expect(campo).toHaveClass('w-full')
    expect(campo).toHaveClass('rounded-2xl')
    expect(campo).toHaveValue('ana@bitacora.ai')
  })
})
