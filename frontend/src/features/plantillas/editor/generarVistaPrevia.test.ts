import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { generarVistaPrevia } from './generarVistaPrevia'
import { importarDocx } from './importarDocx'

const TIPO_MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const RUTA_DOCX_DE_EJEMPLO = resolve(process.cwd(), '../.agent/examples/tem.docx')

function archivoDocxReal(): File {
  const buffer = readFileSync(RUTA_DOCX_DE_EJEMPLO)
  return new File([buffer], 'tem.docx', { type: TIPO_MIME_DOCX })
}

describe('generarVistaPrevia', () => {
  it('con el .docx real de ejemplo y sus marcadores detectados, produce un .docx válido con el tipo MIME correcto', async () => {
    const importado = await importarDocx(archivoDocxReal())
    expect(importado.ok).toBe(true)
    if (!importado.ok) return

    const blob = await generarVistaPrevia(importado.archivoOriginal, importado.marcadores)

    expect(blob.type).toBe(TIPO_MIME_DOCX)
    expect(blob.size).toBeGreaterThan(0)
  })

  it('sin marcadores, igual produce un .docx válido (el original, sin sustituir nada)', async () => {
    const importado = await importarDocx(archivoDocxReal())
    expect(importado.ok).toBe(true)
    if (!importado.ok) return

    const blob = await generarVistaPrevia(importado.archivoOriginal, [])

    expect(blob.size).toBeGreaterThan(0)
  })

  it('con un data URL que no es un .docx válido, la promesa se rechaza', async () => {
    await expect(generarVistaPrevia('data:application/octet-stream;base64,AA==', [])).rejects.toThrow()
  })
})
