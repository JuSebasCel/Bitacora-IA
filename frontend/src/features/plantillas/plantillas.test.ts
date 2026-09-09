import { describe, expect, it } from 'vitest'
import {
  actualizarContenido,
  actualizarMarcadoresDeDocx,
  cambiarColores,
  crearPlantillaDesdeDocx,
  crearPlantillaEnBlanco,
  esPlantillaEnBlancoAbandonada,
  NOMBRE_DE_PLANTILLA_SIN_TOCAR,
  renombrarPlantilla,
  validarImagen,
} from './plantillas'
import type { JSONContent, MarcadorDeDocx } from './data'

const MARCADOR: MarcadorDeDocx = {
  tipo: 'simple',
  id: 'mar-1',
  textoOriginal: '[[Nombre grupo]]',
  contexto: 'Grupo: [[Nombre grupo]]',
  origenDeDato: { tipo: 'personalizado', etiqueta: 'Nombre grupo' },
  formato: 'parrafo',
}

function archivo(nombre: string, tipo: string, tamanoEnBytes: number): File {
  return new File([new Uint8Array(tamanoEnBytes)], nombre, { type: tipo })
}

/* Una plantilla importada nace con su id ya decidido: la ruta de su .docx en el bucket lo contiene. */
const ID_DE_PRUEBA = 'a2c0f7d1-9b3e-4a52-8f10-6d5c4b3a2e11'
const RUTA_DE_PRUEBA = `${ID_DE_PRUEBA}/original.docx`

describe('crearPlantillaEnBlanco', () => {
  it('nace con origen blanco, nombre por defecto y un documento sin contenido', () => {
    const plantilla = crearPlantillaEnBlanco()

    expect(plantilla.origen).toBe('blanco')
    expect(plantilla.nombre).toBe(NOMBRE_DE_PLANTILLA_SIN_TOCAR)
    expect(plantilla.contenido).toEqual({ type: 'doc', content: [{ type: 'paragraph' }] })
  })

  it('cada llamada produce un id distinto', () => {
    const primera = crearPlantillaEnBlanco()
    const segunda = crearPlantillaEnBlanco()

    expect(primera.id).not.toBe(segunda.id)
  })
})

describe('crearPlantillaDesdeDocx', () => {
  it('nace con origen docx, el archivo y los marcadores tal cual se pasaron', () => {
    const plantilla = crearPlantillaDesdeDocx(ID_DE_PRUEBA, RUTA_DE_PRUEBA, 'Mi plantilla', [MARCADOR])

    expect(plantilla.origen).toBe('docx')
    expect(plantilla.id).toBe(ID_DE_PRUEBA)
    expect(plantilla.nombre).toBe('Mi plantilla')
    expect(plantilla.rutaArchivoOriginal).toBe(RUTA_DE_PRUEBA)
    expect(plantilla.marcadores).toEqual([MARCADOR])
  })
})

describe('renombrarPlantilla', () => {
  it('con un nombre válido, lo recorta', () => {
    const plantilla = crearPlantillaEnBlanco()

    const resultado = renombrarPlantilla(plantilla, '  Memoria del taller  ')

    expect(resultado.ok).toBe(true)
    if (resultado.ok) {
      expect(resultado.plantilla.nombre).toBe('Memoria del taller')
    }
  })

  it('rechaza un nombre vacío o solo espacios', () => {
    const plantilla = crearPlantillaEnBlanco()

    const resultado = renombrarPlantilla(plantilla, '   ')

    expect(resultado).toEqual({ ok: false, codigo: 'PLANT_NOMBRE_REQUERIDO' })
  })

  it('rechaza un nombre por encima del largo máximo', () => {
    const plantilla = crearPlantillaEnBlanco()

    const resultado = renombrarPlantilla(plantilla, 'x'.repeat(81))

    expect(resultado).toEqual({ ok: false, codigo: 'PLANT_NOMBRE_MUY_LARGO' })
  })
})

describe('cambiarColores', () => {
  it('actualiza los colores de una plantilla en blanco', () => {
    const plantilla = crearPlantillaEnBlanco()

    const resultado = cambiarColores(plantilla, '#111111', '#222222')

    expect(resultado).toMatchObject({ colorPrincipal: '#111111', colorSecundario: '#222222' })
  })

  it('no hace nada sobre una plantilla docx', () => {
    const plantilla = crearPlantillaDesdeDocx(ID_DE_PRUEBA, RUTA_DE_PRUEBA, 'Prueba', [])

    const resultado = cambiarColores(plantilla, '#111111', '#222222')

    expect(resultado).toBe(plantilla)
  })
})

describe('actualizarContenido', () => {
  it('reemplaza el documento de una plantilla en blanco', () => {
    const plantilla = crearPlantillaEnBlanco()
    const nuevoContenido: JSONContent = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hola' }] }] }

    const resultado = actualizarContenido(plantilla, nuevoContenido)

    expect(resultado.origen).toBe('blanco')
    if (resultado.origen === 'blanco') {
      expect(resultado.contenido).toEqual(nuevoContenido)
    }
  })

  it('no hace nada sobre una plantilla docx', () => {
    const plantilla = crearPlantillaDesdeDocx(ID_DE_PRUEBA, RUTA_DE_PRUEBA, 'Prueba', [])

    const resultado = actualizarContenido(plantilla, { type: 'doc', content: [] })

    expect(resultado).toBe(plantilla)
  })
})

describe('actualizarMarcadoresDeDocx', () => {
  it('reemplaza los marcadores de una plantilla docx', () => {
    const plantilla = crearPlantillaDesdeDocx(ID_DE_PRUEBA, RUTA_DE_PRUEBA, 'Prueba', [])

    const resultado = actualizarMarcadoresDeDocx(plantilla, [MARCADOR])

    expect(resultado.origen).toBe('docx')
    if (resultado.origen === 'docx') {
      expect(resultado.marcadores).toEqual([MARCADOR])
    }
  })

  it('no hace nada sobre una plantilla en blanco', () => {
    const plantilla = crearPlantillaEnBlanco()

    const resultado = actualizarMarcadoresDeDocx(plantilla, [MARCADOR])

    expect(resultado).toBe(plantilla)
  })
})

describe('validarImagen', () => {
  it('acepta png, jpeg y webp dentro del tamaño máximo', () => {
    expect(validarImagen(archivo('logo.png', 'image/png', 1024))).toEqual({ ok: true })
    expect(validarImagen(archivo('logo.jpg', 'image/jpeg', 1024))).toEqual({ ok: true })
    expect(validarImagen(archivo('logo.webp', 'image/webp', 1024))).toEqual({ ok: true })
  })

  it('rechaza un formato no soportado', () => {
    expect(validarImagen(archivo('logo.svg', 'image/svg+xml', 1024))).toEqual({
      ok: false,
      codigo: 'PLANT_IMAGEN_NO_SOPORTADA',
    })
  })

  it('rechaza una imagen por encima del tamaño máximo', () => {
    const grande = archivo('logo.png', 'image/png', 3 * 1024 * 1024)

    expect(validarImagen(grande)).toEqual({ ok: false, codigo: 'PLANT_IMAGEN_MUY_GRANDE' })
  })
})

describe('esPlantillaEnBlancoAbandonada', () => {
  it('una plantilla recién creada, sin tocar, se considera abandonada', () => {
    expect(esPlantillaEnBlancoAbandonada(crearPlantillaEnBlanco())).toBe(true)
  })

  it('renombrarla ya no la deja abandonada, aunque el documento siga vacío', () => {
    const plantilla = crearPlantillaEnBlanco()
    const resultado = renombrarPlantilla(plantilla, 'Con nombre')

    expect(resultado.ok).toBe(true)
    if (resultado.ok) {
      expect(esPlantillaEnBlancoAbandonada(resultado.plantilla)).toBe(false)
    }
  })

  it('escribir texto real ya no la deja abandonada, aunque el nombre siga siendo el de fábrica', () => {
    const plantilla = crearPlantillaEnBlanco()
    const conContenido = actualizarContenido(plantilla, {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Algo real' }] }],
    })

    expect(esPlantillaEnBlancoAbandonada(conContenido)).toBe(false)
  })

  it('un párrafo con solo espacios en blanco sigue contando como abandonada', () => {
    const plantilla = crearPlantillaEnBlanco()
    const conEspacios = actualizarContenido(plantilla, {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: '   ' }] }],
    })

    expect(esPlantillaEnBlancoAbandonada(conEspacios)).toBe(true)
  })

  it('insertar un marcador, aunque no haya texto, ya no la deja abandonada', () => {
    const plantilla = crearPlantillaEnBlanco()
    const conMarcador = actualizarContenido(plantilla, {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'marcador', attrs: { origenTipo: 'campo', campo: 'tema_principal', formato: 'parrafo' } }],
        },
      ],
    })

    expect(esPlantillaEnBlancoAbandonada(conMarcador)).toBe(false)
  })

  it('una plantilla docx nunca se considera una plantilla en blanco abandonada', () => {
    expect(esPlantillaEnBlancoAbandonada(crearPlantillaDesdeDocx(ID_DE_PRUEBA, RUTA_DE_PRUEBA, NOMBRE_DE_PLANTILLA_SIN_TOCAR, []))).toBe(
      false,
    )
  })
})
