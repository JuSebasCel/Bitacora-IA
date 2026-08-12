import { describe, expect, it } from 'vitest'
import { LARGO_MAXIMO_DE_PLANTILLA } from '@/shared/errors'
import { CAMPOS_DE_MARCADOR, DATOS_DE_EJEMPLO } from './data'
import {
  agregarElementoDeImagen,
  agregarElementoDeMarcador,
  agregarElementoDeTexto,
  actualizarElemento,
  cambiarColores,
  crearPlantillaEnBlanco,
  quitarElemento,
  renombrarPlantilla,
  resolverMarcador,
  validarImagen,
} from './plantillas'

describe('crearPlantillaEnBlanco', () => {
  it('trae un id único, no vacío', () => {
    const primera = crearPlantillaEnBlanco()
    const segunda = crearPlantillaEnBlanco()

    expect(primera.id.trim().length).toBeGreaterThan(0)
    expect(primera.id).not.toBe(segunda.id)
  })

  it('arranca sin elementos y con un nombre por defecto', () => {
    const plantilla = crearPlantillaEnBlanco()

    expect(plantilla.elementos).toEqual([])
    expect(plantilla.nombre.trim().length).toBeGreaterThan(0)
  })

  it('trae colores por defecto válidos en formato hex', () => {
    const plantilla = crearPlantillaEnBlanco()

    expect(plantilla.colorPrincipal).toMatch(/^#[0-9a-f]{6}$/i)
    expect(plantilla.colorSecundario).toMatch(/^#[0-9a-f]{6}$/i)
  })
})

describe('renombrarPlantilla', () => {
  const base = crearPlantillaEnBlanco()

  it('con nombre vacío, falla con PLANT_NOMBRE_REQUERIDO', () => {
    const resultado = renombrarPlantilla(base, '   ')

    expect(resultado).toEqual({ ok: false, codigo: 'PLANT_NOMBRE_REQUERIDO' })
  })

  it('con nombre por encima del límite, falla con PLANT_NOMBRE_MUY_LARGO', () => {
    const resultado = renombrarPlantilla(base, 'x'.repeat(LARGO_MAXIMO_DE_PLANTILLA + 1))

    expect(resultado).toEqual({ ok: false, codigo: 'PLANT_NOMBRE_MUY_LARGO' })
  })

  it('con un nombre válido, devuelve la plantilla con el nombre recortado', () => {
    const resultado = renombrarPlantilla(base, '  Memoria del taller  ')

    expect(resultado.ok).toBe(true)
    expect(resultado.ok && resultado.plantilla.nombre).toBe('Memoria del taller')
    expect(resultado.ok && resultado.plantilla.id).toBe(base.id)
  })

  it('no muta la plantilla recibida', () => {
    renombrarPlantilla(base, 'Otro nombre')

    expect(base.nombre).not.toBe('Otro nombre')
  })
})

describe('cambiarColores', () => {
  it('devuelve la plantilla con los dos colores actualizados', () => {
    const base = crearPlantillaEnBlanco()

    const resultado = cambiarColores(base, '#111111', '#222222')

    expect(resultado.colorPrincipal).toBe('#111111')
    expect(resultado.colorSecundario).toBe('#222222')
  })

  it('no muta la plantilla recibida', () => {
    const base = crearPlantillaEnBlanco()

    cambiarColores(base, '#111111', '#222222')

    expect(base.colorPrincipal).not.toBe('#111111')
  })
})

describe('agregarElementoDeTexto', () => {
  it('añade un elemento de texto con id único y posición por defecto dentro del lienzo', () => {
    const base = crearPlantillaEnBlanco()

    const resultado = agregarElementoDeTexto(base)

    expect(resultado.elementos).toHaveLength(1)
    const [elemento] = resultado.elementos
    expect(elemento?.tipo).toBe('texto')
    expect(elemento?.id.trim().length).toBeGreaterThan(0)
    expect(elemento?.posicion.x).toBeGreaterThanOrEqual(0)
    expect(elemento?.posicion.y).toBeGreaterThanOrEqual(0)
  })

  it('no muta la plantilla recibida', () => {
    const base = crearPlantillaEnBlanco()

    agregarElementoDeTexto(base)

    expect(base.elementos).toEqual([])
  })

  it('dos elementos agregados tienen ids distintos', () => {
    const base = crearPlantillaEnBlanco()

    const conUno = agregarElementoDeTexto(base)
    const conDos = agregarElementoDeTexto(conUno)

    const [primero, segundo] = conDos.elementos
    expect(primero?.id).not.toBe(segundo?.id)
  })
})

describe('agregarElementoDeImagen', () => {
  it('añade un elemento de imagen con la url y el nombre de archivo dados', () => {
    const base = crearPlantillaEnBlanco()

    const resultado = agregarElementoDeImagen(base, 'data:image/png;base64,AAAA', 'logo.png')

    const [elemento] = resultado.elementos
    expect(elemento?.tipo).toBe('imagen')
    expect(elemento && elemento.tipo === 'imagen' && elemento.url).toBe('data:image/png;base64,AAAA')
    expect(elemento && elemento.tipo === 'imagen' && elemento.nombreDeArchivo).toBe('logo.png')
  })
})

describe('agregarElementoDeMarcador', () => {
  it('añade un marcador con el campo y formato por defecto', () => {
    const base = crearPlantillaEnBlanco()

    const resultado = agregarElementoDeMarcador(base)

    const [elemento] = resultado.elementos
    expect(elemento?.tipo).toBe('marcador')
    expect(elemento && elemento.tipo === 'marcador' && elemento.campo).toBe(CAMPOS_DE_MARCADOR[0])
    expect(elemento && elemento.tipo === 'marcador' && elemento.formato).toBe('parrafo')
  })

  it('acepta un campo y formato específicos', () => {
    const base = crearPlantillaEnBlanco()

    const resultado = agregarElementoDeMarcador(base, 'cita_destacada', 'lista')

    const [elemento] = resultado.elementos
    expect(elemento && elemento.tipo === 'marcador' && elemento.campo).toBe('cita_destacada')
    expect(elemento && elemento.tipo === 'marcador' && elemento.formato).toBe('lista')
  })
})

describe('actualizarElemento', () => {
  it('cambia el contenido de un elemento de texto por id, sin tocar los demás', () => {
    const conDos = agregarElementoDeTexto(agregarElementoDeTexto(crearPlantillaEnBlanco()))
    const [primero, segundo] = conDos.elementos
    if (primero === undefined || segundo === undefined) throw new Error('faltan elementos')

    const resultado = actualizarElemento(conDos, primero.id, { contenido: 'Nuevo texto' })

    const actualizado = resultado.elementos.find((elemento) => elemento.id === primero.id)
    const intacto = resultado.elementos.find((elemento) => elemento.id === segundo.id)
    expect(actualizado?.tipo === 'texto' && actualizado.contenido).toBe('Nuevo texto')
    expect(intacto).toEqual(segundo)
  })

  it('con un id inexistente, devuelve la plantilla sin cambios', () => {
    const base = agregarElementoDeTexto(crearPlantillaEnBlanco())

    const resultado = actualizarElemento(base, 'no-existe', { contenido: 'x' })

    expect(resultado).toEqual(base)
  })
})

describe('quitarElemento', () => {
  it('quita el elemento con ese id', () => {
    const conUno = agregarElementoDeTexto(crearPlantillaEnBlanco())
    const [elemento] = conUno.elementos
    if (elemento === undefined) throw new Error('falta el elemento')

    const resultado = quitarElemento(conUno, elemento.id)

    expect(resultado.elementos).toEqual([])
  })

  it('deja intactos los demás elementos', () => {
    const conDos = agregarElementoDeTexto(agregarElementoDeTexto(crearPlantillaEnBlanco()))
    const [primero, segundo] = conDos.elementos
    if (primero === undefined || segundo === undefined) throw new Error('faltan elementos')

    const resultado = quitarElemento(conDos, primero.id)

    expect(resultado.elementos).toEqual([segundo])
  })
})

describe('validarImagen', () => {
  it('acepta png, jpeg y webp', () => {
    for (const tipo of ['image/png', 'image/jpeg', 'image/webp']) {
      const archivo = new File([new Uint8Array(10)], 'logo', { type: tipo })
      expect(validarImagen(archivo)).toEqual({ ok: true })
    }
  })

  it('rechaza un tipo no soportado, ej. svg', () => {
    const archivo = new File([new Uint8Array(10)], 'logo.svg', { type: 'image/svg+xml' })

    expect(validarImagen(archivo)).toEqual({ ok: false, codigo: 'PLANT_IMAGEN_NO_SOPORTADA' })
  })

  it('rechaza un archivo por encima del tamaño máximo', () => {
    const archivoGrande = new File([new Uint8Array(3 * 1024 * 1024)], 'logo.png', { type: 'image/png' })

    expect(validarImagen(archivoGrande)).toEqual({ ok: false, codigo: 'PLANT_IMAGEN_MUY_GRANDE' })
  })
})

describe('resolverMarcador', () => {
  it('resuelve cada combinación de campo y formato a un dato de ejemplo no vacío', () => {
    for (const campo of CAMPOS_DE_MARCADOR) {
      expect(resolverMarcador(campo, 'parrafo')).toBe(DATOS_DE_EJEMPLO[campo].parrafo)
      expect(resolverMarcador(campo, 'lista')).toEqual(DATOS_DE_EJEMPLO[campo].lista)
    }
  })
})
