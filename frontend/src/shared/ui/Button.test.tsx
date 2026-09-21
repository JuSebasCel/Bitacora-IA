import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { FormEvent } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './Button'

describe('Button', () => {
  it('renderiza su contenido y responde al click', async () => {
    const alPresionar = vi.fn()
    render(<Button onClick={alPresionar}>Guardar</Button>)

    const boton = screen.getByRole('button', { name: 'Guardar' })
    await userEvent.click(boton)

    expect(boton).toHaveTextContent('Guardar')
    expect(alPresionar).toHaveBeenCalledTimes(1)
  })

  it('con cargando queda deshabilitado, expone aria-busy y no dispara el click', async () => {
    const alPresionar = vi.fn()
    render(
      <Button cargando onClick={alPresionar}>
        Guardar
      </Button>,
    )

    const boton = screen.getByRole('button')
    await userEvent.click(boton)

    expect(boton).toBeDisabled()
    expect(boton).toHaveAttribute('aria-busy', 'true')
    expect(alPresionar).not.toHaveBeenCalled()
    // La etiqueta original sigue en el DOM junto al indicador de carga.
    expect(boton).toHaveTextContent('Guardar')
    expect(boton).toHaveAccessibleName(/cargando/i)
  })

  it('deshabilitado no dispara el click', async () => {
    const alPresionar = vi.fn()
    render(
      <Button disabled onClick={alPresionar}>
        Guardar
      </Button>,
    )

    const boton = screen.getByRole('button', { name: 'Guardar' })
    await userEvent.click(boton)

    expect(boton).toBeDisabled()
    expect(boton).not.toHaveAttribute('aria-busy', 'true')
    expect(alPresionar).not.toHaveBeenCalled()
  })

  it('aplica clases distintas por variante y usa primario por defecto', () => {
    const { unmount } = render(<Button>Primario</Button>)
    const porDefecto = screen.getByRole('button').className
    unmount()

    render(
      <>
        <Button variante="primario">Uno</Button>
        <Button variante="secundario">Dos</Button>
        <Button variante="sutil">Tres</Button>
      </>,
    )

    const primario = screen.getByRole('button', { name: 'Uno' }).className
    const secundario = screen.getByRole('button', { name: 'Dos' }).className
    const sutil = screen.getByRole('button', { name: 'Tres' }).className

    expect(porDefecto).toBe(primario)
    expect(primario).not.toBe(secundario)
    expect(secundario).not.toBe(sutil)
    expect(primario).not.toBe(sutil)

    // Todos comparten el radio unico del sistema de diseno.
    for (const clases of [primario, secundario, sutil]) {
      expect(clases).toContain('rounded-full')
      expect(clases).toContain('active:translate-y-px')
    }
    expect(primario).toContain('bg-acento')
    expect(primario).toContain('text-acento-contraste')
    expect(secundario).toContain('shadow-[inset_0_0_0_1px_var(--bitacora-filete)]')
  })

  it('sin type explicito no envia el formulario que lo contiene', async () => {
    const alEnviar = vi.fn()
    render(
      <form onSubmit={alEnviar}>
        <Button>Cancelar</Button>
      </form>,
    )

    const boton = screen.getByRole('button', { name: 'Cancelar' })
    await userEvent.click(boton)

    expect(boton).toHaveAttribute('type', 'button')
    expect(alEnviar).not.toHaveBeenCalled()
  })

  it('con type submit envia el formulario que lo contiene', async () => {
    const alEnviar = vi.fn((evento: FormEvent<HTMLFormElement>) => {
      evento.preventDefault()
    })
    render(
      <form onSubmit={alEnviar}>
        <Button type="submit">Entrar</Button>
      </form>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(alEnviar).toHaveBeenCalledTimes(1)
  })

  it('reenvia props nativas de button y conserva el className adicional', () => {
    render(
      <Button type="submit" name="accion" className="w-full" variante="secundario">
        Enviar
      </Button>,
    )

    const boton = screen.getByRole('button', { name: 'Enviar' })
    expect(boton).toHaveAttribute('type', 'submit')
    expect(boton).toHaveAttribute('name', 'accion')
    expect(boton).toHaveClass('w-full')
    expect(boton).toHaveClass('rounded-full')
  })
})
