import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Editor } from '@tiptap/core'
import { useEditor } from '@tiptap/react'
import type { ReactElement } from 'react'
import { useEffect } from 'react'
import { describe, expect, it } from 'vitest'
import { EXTENSIONES_DE_PLANTILLA } from '../editor/extensionesDePlantilla'
import { BarraDeHerramientas } from './BarraDeHerramientas'

type PropsArnes = { onEditorListo: (editor: Editor) => void }

function ArnesDeEditor({ onEditorListo }: PropsArnes): ReactElement {
  const editor = useEditor({
    extensions: EXTENSIONES_DE_PLANTILLA,
    content: '<p>Hola mundo</p>',
    immediatelyRender: false,
  })

  useEffect(() => {
    if (editor !== null) {
      onEditorListo(editor)
    }
  }, [editor, onEditorListo])

  return <BarraDeHerramientas editor={editor} />
}

async function montarConEditor(): Promise<Editor> {
  let editorCapturado: Editor | null = null
  render(<ArnesDeEditor onEditorListo={(editor) => (editorCapturado = editor)} />)

  await waitFor(() => expect(editorCapturado).not.toBeNull())
  return editorCapturado as unknown as Editor
}

describe('BarraDeHerramientas', () => {
  it('sin editor (null), los botones no truenan al hacer clic', async () => {
    const usuario = userEvent.setup()
    render(<BarraDeHerramientas editor={null} />)

    await usuario.click(screen.getByRole('button', { name: 'Negrita' }))

    expect(screen.getByRole('button', { name: 'Negrita' })).toBeInTheDocument()
  })

  it('Negrita alterna la marca activa', async () => {
    const usuario = userEvent.setup()
    const editor = await montarConEditor()
    expect(editor.isActive('bold')).toBe(false)

    await usuario.click(screen.getByRole('button', { name: 'Negrita' }))

    expect(editor.isActive('bold')).toBe(true)
  })

  it('Título aplica un encabezado de nivel 1', async () => {
    const usuario = userEvent.setup()
    const editor = await montarConEditor()

    await usuario.click(screen.getByRole('button', { name: 'Título' }))

    expect(editor.isActive('heading', { level: 1 })).toBe(true)
  })

  it('Centrar alinea el párrafo actual al centro', async () => {
    const usuario = userEvent.setup()
    const editor = await montarConEditor()

    await usuario.click(screen.getByRole('button', { name: 'Centrar' }))

    expect(editor.isActive({ textAlign: 'center' })).toBe(true)
  })

  it('Lista con viñetas convierte el párrafo en una lista', async () => {
    const usuario = userEvent.setup()
    const editor = await montarConEditor()

    await usuario.click(screen.getByRole('button', { name: 'Lista con viñetas' }))

    expect(editor.isActive('bulletList')).toBe(true)
  })

  /*
    `readAsDataURL` de `FileReader` no completa de forma confiable en jsdom
    para un `File` real subido vía `userEvent.upload` — el camino feliz de
    inserción de imagen se verifica en el E2E (navegador real). Aquí solo se
    cubre lo que sí es determinístico: el archivo rechazado por tipo nunca
    llega a intentar leerse, así que el mensaje de error aparece de inmediato
    y de forma síncrona con la validación (`validarImagen`, ya probada en
    `plantillas.test.ts`).
  */
  it('subir una imagen no soportada muestra el error sin intentar leerla', async () => {
    const editor = await montarConEditor()
    const entradaDeArchivo = document.querySelector('input[type="file"]') as HTMLInputElement

    /*
      `userEvent.upload` filtra por el atributo `accept` del input, como un
      selector de archivos real (ver `.agent/PROGRESS.md`, hallazgo de F3):
      con un tipo no admitido, el archivo nunca llega a asignarse y el
      `onChange` no dispara. `fireEvent.change` sí permite probar este caso.
    */
    fireEvent.change(entradaDeArchivo, { target: { files: [new File(['x'], 'logo.svg', { type: 'image/svg+xml' })] } })

    expect(await screen.findByText(/no tiene un formato admitido/i)).toBeInTheDocument()
    expect(editor.isActive('image')).toBe(false)
  })

  it('el disparador de imagen abre un selector de archivo limitado a png/jpeg/webp', () => {
    render(<BarraDeHerramientas editor={null} />)

    const entradaDeArchivo = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(entradaDeArchivo).toHaveAttribute('accept', 'image/png,image/jpeg,image/webp')
  })

  it('marcar la selección como sección condicional envuelve el párrafo en un nodo seccionMarcador', async () => {
    const usuario = userEvent.setup()
    const editor = await montarConEditor()

    await usuario.click(screen.getByRole('button', { name: /marcar selección como sección condicional/i }))
    await usuario.click(await screen.findByRole('button', { name: 'Aplicar' }))

    expect(editor.isActive('seccionMarcador')).toBe(true)
    expect(editor.getAttributes('seccionMarcador')).toMatchObject({ modo: 'condicional' })
  })

  it('marcar la selección como sección repetible envuelve el párrafo con modo repetible', async () => {
    const usuario = userEvent.setup()
    const editor = await montarConEditor()

    await usuario.click(screen.getByRole('button', { name: /marcar selección como sección repetible/i }))
    await usuario.click(await screen.findByRole('button', { name: 'Aplicar' }))

    expect(editor.isActive('seccionMarcador')).toBe(true)
    expect(editor.getAttributes('seccionMarcador')).toMatchObject({ modo: 'repetible' })
  })
})
