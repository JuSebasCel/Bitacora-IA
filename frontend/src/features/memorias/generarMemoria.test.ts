import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { Conferencia, Ficha } from '@/features/conferencias/data'
import { importarDocx } from '@/features/plantillas/editor/importarDocx'
import { actualizarContenido, crearPlantillaDesdeDocx, crearPlantillaEnBlanco } from '@/features/plantillas/plantillas'
import type { JSONContent } from '@/features/plantillas/data'
import type { Tema } from '@/features/taxonomia'
import { generarMemoria } from './generarMemoria'

const TIPO_MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const RUTA_DOCX_DE_EJEMPLO = resolve(process.cwd(), 'tests/fixtures/tem.docx')

function archivoDocxReal(): File {
  const buffer = readFileSync(RUTA_DOCX_DE_EJEMPLO)
  return new File([buffer], 'tem.docx', { type: TIPO_MIME_DOCX })
}

/* En producción estos bytes bajan del bucket `plantillas-docx`; la generación no sabe de dónde salen. */
function bytesDocxReal(): ArrayBuffer {
  /*
    Se copia a un `Uint8Array` del entorno de la prueba en vez de devolver el
    `ArrayBuffer` interno del `Buffer` de Node: bajo jsdom son realms
    distintos, y JSZip decide qué recibió con `instanceof`, así que el buffer
    de Node le llega como un tipo que no reconoce.
  */
  return new Uint8Array(readFileSync(RUTA_DOCX_DE_EJEMPLO)).buffer
}

const ID_DE_PLANTILLA = 'c7d2e4a9-53b1-4f08-9c6e-2a1b8d4f7c33'

const CONFERENCIA: Conferencia = {
  id: 'cnf-prueba',
  titulo: 'Charla de prueba',
  ponente: 'Rodrigo Peñaloza',
  evento: 'Evento de prueba',
  codigoDeEvento: 'PRU-2026-01',
  fechaDelEvento: '2026-05-01',
  duracionEnSegundos: 1200,
  maximoDeFichas: null,
  idDueno: 'usr-prueba',
  estado: 'procesada',
  idTemaPrincipal: 'tem-de-prueba',
  resumen: 'Resumen general de la charla.',
  fuente: 'audio',
  comparticiones: [],
}

const FICHAS: readonly Ficha[] = []

/* Pool mínimo con el que resolver el nombre del tema principal de la conferencia. */
const TEMAS: readonly Tema[] = [{ id: 'tem-de-prueba', nombre: 'Un tema de prueba' }]

describe('generarMemoria', () => {
  it('para una plantilla en blanco, sustituye su contenido y lo devuelve como origen «blanco»', async () => {
    const contenidoConMarcador: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'marcador',
              attrs: { origenTipo: 'campo', campo: 'nombre_ponente', etiquetaPersonalizada: null, formato: 'parrafo' },
            },
          ],
        },
      ],
    }
    const plantilla = actualizarContenido(crearPlantillaEnBlanco(), contenidoConMarcador)

    const resultado = await generarMemoria(plantilla, CONFERENCIA, FICHAS, TEMAS, null)

    expect(resultado.origen).toBe('blanco')
    if (resultado.origen === 'blanco') {
      expect(JSON.stringify(resultado.contenido)).toContain('Rodrigo Peñaloza')
    }
  })

  it('para una plantilla docx, genera un .docx real y lo devuelve como origen «docx»', async () => {
    const importado = await importarDocx(archivoDocxReal())
    expect(importado.ok).toBe(true)
    if (!importado.ok) return
    const plantilla = crearPlantillaDesdeDocx(
      ID_DE_PLANTILLA,
      `${ID_DE_PLANTILLA}/original.docx`,
      'Prueba',
      importado.marcadores,
    )

    const resultado = await generarMemoria(plantilla, CONFERENCIA, FICHAS, TEMAS, bytesDocxReal())

    expect(resultado.origen).toBe('docx')
    if (resultado.origen === 'docx') {
      expect(resultado.blob.type).toBe(TIPO_MIME_DOCX)
      expect(resultado.blob.size).toBeGreaterThan(0)
    }
  })

  /*
    Pedir una memoria de plantilla importada sin sus bytes es un error de quien
    llama, no algo que la persona pueda arreglar: se rechaza para que la
    pantalla lo traduzca a `MEM_FALLO_GENERACION` en vez de entregar un
    documento sin el diseño de Word.
  */
  it('para una plantilla docx sin los bytes del archivo, la promesa se rechaza', async () => {
    const plantilla = crearPlantillaDesdeDocx(ID_DE_PLANTILLA, `${ID_DE_PLANTILLA}/original.docx`, 'Prueba', [])

    await expect(generarMemoria(plantilla, CONFERENCIA, FICHAS, TEMAS, null)).rejects.toThrow()
  })
})
