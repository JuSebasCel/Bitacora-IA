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

/*
  Los mismos bytes que en producción bajan del bucket `plantillas-docx`. Aquí
  se leen del `.docx` versionado en `tests/fixtures/`: lo que se prueba es la
  sustitución, que no cambia según de dónde vengan los bytes.
*/
function bytesDocxReal(): ArrayBuffer {
  /*
    Se copia a un `Uint8Array` del entorno de la prueba en vez de devolver el
    `ArrayBuffer` interno del `Buffer` de Node: bajo jsdom son realms
    distintos, y JSZip decide qué recibió con `instanceof`, así que el buffer
    de Node le llega como un tipo que no reconoce.
  */
  return new Uint8Array(readFileSync(RUTA_DOCX_DE_EJEMPLO)).buffer
}

describe('generarVistaPrevia', () => {
  it('con el .docx real de ejemplo y sus marcadores detectados, produce un .docx válido con el tipo MIME correcto', async () => {
    const importado = await importarDocx(archivoDocxReal())
    expect(importado.ok).toBe(true)
    if (!importado.ok) return

    const blob = await generarVistaPrevia(bytesDocxReal(), importado.marcadores)

    expect(blob.type).toBe(TIPO_MIME_DOCX)
    expect(blob.size).toBeGreaterThan(0)
  })

  it('sin marcadores, igual produce un .docx válido (el original, sin sustituir nada)', async () => {
    const importado = await importarDocx(archivoDocxReal())
    expect(importado.ok).toBe(true)
    if (!importado.ok) return

    const blob = await generarVistaPrevia(bytesDocxReal(), [])

    expect(blob.size).toBeGreaterThan(0)
  })

  it('con bytes que no son un .docx válido, la promesa se rechaza', async () => {
    await expect(generarVistaPrevia(new Uint8Array([0, 1, 2]).buffer, [])).rejects.toThrow()
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

    const sinDatos = await generarVistaPrevia(bytesDocxReal(), importado.marcadores)
    const conDatos = await generarVistaPrevia(bytesDocxReal(), importado.marcadores, datosReales)

    const [xmlSinDatos, xmlConDatos] = await Promise.all([
      JSZip.loadAsync(await sinDatos.arrayBuffer()).then((zip) => zip.file('word/document.xml')?.async('string')),
      JSZip.loadAsync(await conDatos.arrayBuffer()).then((zip) => zip.file('word/document.xml')?.async('string')),
    ])

    expect(xmlConDatos).toEqual(xmlSinDatos)
  })
})
