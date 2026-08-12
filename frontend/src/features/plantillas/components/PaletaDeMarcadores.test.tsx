import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Editor } from '@tiptap/core'
import { useEditor } from '@tiptap/react'
import type { ReactElement } from 'react'
import { useEffect } from 'react'
import { describe, expect, it } from 'vitest'
import { EXTENSIONES_DE_PLANTILLA } from '../editor/extensionesDePlantilla'
import { FORMATO_MIME_MARCADOR, PaletaDeMarcadores } from './PaletaDeMarcadores'

type PropsArnes = { onEditorListo: (editor: Editor) => void }

function ArnesDeEditor({ onEditorListo }: PropsArnes): ReactElement {
  const editor = useEditor({
    extensions: EXTENSIONES_DE_PLANTILLA,
    content: '<p></p>',
    immediatelyRender: false,
  })

  useEffect(() => {
    if (editor !== null) {
      onEditorListo(editor)
    }
  }, [editor, onEditorListo])

  return <PaletaDeMarcadores editor={editor} />
}

async function montarConEditor(): Promise<Editor> {
  let editorCapturado: Editor | null = null
  render(<ArnesDeEditor onEditorListo={(editor) => (editorCapturado = editor)} />)

  await waitFor(() => expect(editorCapturado).not.toBeNull())
  return editorCapturado as unknown as Editor
}

describe('PaletaDeMarcadores', () => {
  it('muestra los cinco campos fijos del repositorio', () => {
    render(<PaletaDeMarcadores editor={null} />)

    const lista = screen.getByRole('list', { name: 'Campos disponibles' })
    expect(lista.querySelectorAll('button')).toHaveLength(5)
  })

  it('hacer clic en un campo lo inserta como marcador en la posición del cursor', async () => {
    const usuario = userEvent.setup()
    const editor = await montarConEditor()

    await usuario.click(screen.getByRole('button', { name: 'Nombre del ponente' }))

    expect(editor.getJSON()).toMatchObject({
      content: [
        {
          content: [{ type: 'marcador', attrs: expect.objectContaining({ campo: 'nombre_ponente' }) }],
        },
      ],
    })
  })

  it('arrastrar un campo coloca su origen en el dataTransfer con el tipo MIME propio', () => {
    render(<PaletaDeMarcadores editor={null} />)
    const setData = vi.fn()

    fireEvent.dragStart(screen.getByRole('button', { name: 'Fecha del evento' }), {
      dataTransfer: { setData, effectAllowed: '' },
    })

    expect(setData).toHaveBeenCalledWith(FORMATO_MIME_MARCADOR, JSON.stringify({ tipo: 'campo', campo: 'fecha_evento' }))
  })

  it('agregar un campo personalizado sin descripción muestra un error', async () => {
    const usuario = userEvent.setup()
    render(<PaletaDeMarcadores editor={null} />)

    await usuario.click(screen.getByRole('button', { name: 'Agregar campo personalizado' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/escribe una descripción/i)
  })

  it('agregar un campo personalizado con descripción lo suma a la lista de chips', async () => {
    const usuario = userEvent.setup()
    render(<PaletaDeMarcadores editor={null} />)

    await usuario.type(screen.getByLabelText('Campo personalizado'), 'Puntos de la agenda')
    await usuario.click(screen.getByRole('button', { name: 'Agregar campo personalizado' }))

    expect(screen.getByRole('button', { name: 'Puntos de la agenda' })).toBeInTheDocument()
    // El campo de texto se limpia tras agregarlo.
    expect(screen.getByLabelText('Campo personalizado')).toHaveValue('')
  })

  it('presionar Enter en el campo de texto también agrega el campo personalizado', async () => {
    const usuario = userEvent.setup()
    render(<PaletaDeMarcadores editor={null} />)

    await usuario.type(screen.getByLabelText('Campo personalizado'), 'Notas finales{Enter}')

    expect(screen.getByRole('button', { name: 'Notas finales' })).toBeInTheDocument()
  })
})
