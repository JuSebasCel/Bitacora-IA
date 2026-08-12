import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { importarDocx, validarDocx } from './importarDocx'

const TIPO_MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

/* El archivo real que motivó todo el diseño del módulo — ver `.agent/plans/`. Ruta relativa a `frontend/`, donde corre Vitest. */
const RUTA_DOCX_DE_EJEMPLO = resolve(process.cwd(), '../.agent/examples/tem.docx')

function archivoDocxReal(): File {
  const buffer = readFileSync(RUTA_DOCX_DE_EJEMPLO)
  return new File([buffer], 'tem.docx', { type: TIPO_MIME_DOCX })
}

function archivo(nombre: string, tipo: string, tamanoEnBytes = 10): File {
  return new File([new Uint8Array(tamanoEnBytes)], nombre, { type: tipo })
}

describe('validarDocx', () => {
  it('acepta por extensión .docx, sin importar el tipo MIME reportado', () => {
    expect(validarDocx(archivo('plantilla.docx', ''))).toEqual({ ok: true })
  })

  it('acepta por tipo MIME aunque la extensión no sea .docx', () => {
    expect(validarDocx(archivo('plantilla', TIPO_MIME_DOCX))).toEqual({ ok: true })
  })

  it('rechaza un archivo que no es .docx', () => {
    expect(validarDocx(archivo('imagen.png', 'image/png'))).toEqual({
      ok: false,
      codigo: 'PLANT_DOCX_NO_SOPORTADO',
    })
  })

  it('rechaza un archivo por encima del tamaño máximo', () => {
    expect(validarDocx(archivo('plantilla.docx', '', 11 * 1024 * 1024))).toEqual({
      ok: false,
      codigo: 'PLANT_DOCX_MUY_GRANDE',
    })
  })
})

describe('importarDocx', () => {
  it('con un archivo que no es .docx, falla sin intentar leerlo', async () => {
    const resultado = await importarDocx(archivo('imagen.png', 'image/png'))

    expect(resultado).toEqual({ ok: false, codigo: 'PLANT_DOCX_NO_SOPORTADO' })
  })

  it('con un .docx corrupto, falla con el código de importación', async () => {
    const resultado = await importarDocx(archivo('plantilla.docx', TIPO_MIME_DOCX, 20))

    expect(resultado).toEqual({ ok: false, codigo: 'PLANT_DOCX_FALLO_IMPORTACION' })
  })

  it('con el .docx real de ejemplo, detecta los cinco marcadores y conserva el archivo intacto como data URL', async () => {
    const resultado = await importarDocx(archivoDocxReal())

    expect(resultado.ok).toBe(true)
    if (resultado.ok) {
      expect(resultado.marcadores).toHaveLength(5)
      expect(resultado.marcadores.every((marcador) => marcador.tipo === 'simple')).toBe(true)
      expect(resultado.archivoOriginal.startsWith('data:')).toBe(true)
    }
  })
})
