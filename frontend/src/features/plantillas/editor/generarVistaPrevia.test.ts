import JSZip from 'jszip'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { RegistroDeDatosDeCampo } from '../data'
import { generarVistaPrevia } from './generarVistaPrevia'
import { importarDocx } from './importarDocx'

const TIPO_MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const RUTA_DOCX_DE_EJEMPLO = resolve(process.cwd(), 'tests/fixtures/tem.docx')

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

  it('acepta datos reales y los usa para los marcadores de campo fijo, sin alterar los personalizados', async () => {
    const importado = await importarDocx(archivoDocxReal())
    expect(importado.ok).toBe(true)
    if (!importado.ok) return

    /*
      Todos los marcadores de `tem.docx` son de etiqueta personalizada (así
      detecta un `.docx` importado, siempre): pasar datos reales para un
      campo fijo no debería cambiar el contenido sustituido frente a no pasar
      nada, porque ningún marcador de este archivo referencia ese campo.
      Se compara el `word/document.xml` ya sustituido, no los bytes crudos
      del `.docx`: el empaquetado ZIP incrusta una marca de tiempo con
      granularidad de 2 segundos en cada entrada, así que dos llamadas
      consecutivas pueden diferir en ese byte sin que el contenido real haya
      cambiado — comparar bytes crudos aquí sería una prueba intermitente.
    */
    const datosReales: RegistroDeDatosDeCampo = {
      nombre_ponente: { parrafo: 'Rodrigo Peñaloza', lista: ['Rodrigo Peñaloza'] },
    }

    const sinDatos = await generarVistaPrevia(importado.archivoOriginal, importado.marcadores)
    const conDatos = await generarVistaPrevia(importado.archivoOriginal, importado.marcadores, datosReales)

    const [xmlSinDatos, xmlConDatos] = await Promise.all([
      JSZip.loadAsync(await sinDatos.arrayBuffer()).then((zip) => zip.file('word/document.xml')?.async('string')),
      JSZip.loadAsync(await conDatos.arrayBuffer()).then((zip) => zip.file('word/document.xml')?.async('string')),
    ])

    expect(xmlConDatos).toEqual(xmlSinDatos)
  })
})
