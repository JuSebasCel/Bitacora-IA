import { describe, expect, it } from 'vitest'
import { CODIGOS_DE_ERROR, mensajeDeError, type CodigoError } from './index'

describe('catálogo de errores', () => {
  it('resuelve cada código conocido a un mensaje no vacío', () => {
    for (const codigo of CODIGOS_DE_ERROR) {
      const mensaje = mensajeDeError(codigo)
      expect(mensaje.trim().length).toBeGreaterThan(0)
    }
  })

  it('no incrusta el código crudo dentro del mensaje de un código conocido', () => {
    for (const codigo of CODIGOS_DE_ERROR) {
      expect(mensajeDeError(codigo)).not.toContain(codigo)
    }
  })

  it('devuelve mensajes distintos para códigos distintos', () => {
    const mensajes = CODIGOS_DE_ERROR.map((codigo: CodigoError) => mensajeDeError(codigo))
    expect(new Set(mensajes).size).toBe(mensajes.length)
  })

  it('cae a un mensaje genérico cuando el código es desconocido', () => {
    const mensaje = mensajeDeError('FALLA_INTERNA_DE_BASE_DE_DATOS')

    expect(mensaje.trim().length).toBeGreaterThan(0)
    expect(mensaje).not.toContain('FALLA_INTERNA_DE_BASE_DE_DATOS')
  })

  it('el mensaje genérico no filtra el código ni detalle técnico', () => {
    const codigosSospechosos = [
      'AUTH_TOKEN_EXPIRADO',
      'DB_CONNECTION_REFUSED',
      'stack: Error at line 42',
      '',
      'undefined',
    ]

    for (const codigo of codigosSospechosos) {
      const mensaje = mensajeDeError(codigo)
      expect(mensaje).toBe(mensajeDeError('OTRO_CODIGO_TOTALMENTE_DISTINTO'))
      if (codigo.length > 0) {
        expect(mensaje).not.toContain(codigo)
      }
      expect(mensaje).not.toMatch(/_[A-Z]/)
      expect(mensaje.toLowerCase()).not.toContain('error:')
      expect(mensaje.toLowerCase()).not.toContain('stack')
      expect(mensaje.toLowerCase()).not.toContain('undefined')
    }
  })
})

/*
  Códigos que introduce F2 (dashboard de conferencias). Se listan aquí a mano, y
  no derivados del catálogo, para que quitar uno por accidente rompa la prueba
  en vez de pasar desapercibido.
*/
const CODIGOS_DE_F2 = [
  'CONF_NO_ENCONTRADA',
  'CONF_PROCESAMIENTO_FALLIDO',
  'ETQ_NOMBRE_REQUERIDO',
  'ETQ_YA_EXISTE',
  'ETQ_NOMBRE_MUY_LARGO',
  'ETQ_NO_EDITABLE',
] as const

/* Un código que el catálogo nunca va a conocer, para obtener el mensaje genérico. */
const CODIGO_INEXISTENTE = 'CODIGO_QUE_NO_ESTA_EN_EL_CATALOGO'

describe('códigos de error de F2', () => {
  it('registra en el catálogo los códigos de conferencias y de etiquetas', () => {
    for (const codigo of CODIGOS_DE_F2) {
      expect(CODIGOS_DE_ERROR).toContain(codigo)
    }
  })

  it('ningún código de F2 cae al mensaje genérico', () => {
    const generico = mensajeDeError(CODIGO_INEXISTENTE)

    for (const codigo of CODIGOS_DE_F2) {
      expect(mensajeDeError(codigo)).not.toBe(generico)
    }
  })

  it('traduce cada código de F2 a un mensaje accionable', () => {
    for (const codigo of CODIGOS_DE_F2) {
      const mensaje = mensajeDeError(codigo)

      expect(mensaje.length).toBeGreaterThan(20)
      expect(mensaje.trim()).toBe(mensaje)
    }
  })

  it('ningún mensaje de F2 filtra un código ni detalle técnico', () => {
    for (const codigo of CODIGOS_DE_F2) {
      const mensaje = mensajeDeError(codigo)

      expect(mensaje).not.toMatch(/_[A-Z]/)
      expect(mensaje.toLowerCase()).not.toContain('undefined')
      expect(mensaje.toLowerCase()).not.toContain('null')
    }
  })

  /*
    El detalle devuelve este código tanto para un identificador inventado como
    para una conferencia ajena. Si el mensaje insinuara que la conferencia
    existe pero es de otra persona, la pantalla se convertiría en un oráculo
    para averiguar qué subió alguien más, que es justo lo que evita la regla de
    aislamiento por fila de PLAN.md sección 6.3.
  */
  it('no revela si una conferencia no encontrada existe en manos de otra persona', () => {
    const mensaje = mensajeDeError('CONF_NO_ENCONTRADA').toLowerCase()

    expect(mensaje).not.toMatch(/permiso|autoriz|prohib|denegad|ajena|de otra persona|privada/)
  })

  it('indica el límite exacto en el mensaje de nombre de etiqueta demasiado largo', () => {
    expect(mensajeDeError('ETQ_NOMBRE_MUY_LARGO')).toContain('24')
  })

  /*
    Las etiquetas se crean al vuelo desde el propio filtro, así que un choque de
    nombre no puede ser un callejón sin salida: el mensaje tiene que decir qué
    hacer a continuación.
  */
  it('ofrece una salida en el mensaje de etiqueta ya existente', () => {
    const mensaje = mensajeDeError('ETQ_YA_EXISTE').toLowerCase()

    expect(mensaje).toMatch(/elíge|elige|usa|otro nombre|lista/)
  })
})

/* Códigos que introduce F3 (carga de conferencia). Listados a mano, como en F2. */
const CODIGOS_DE_F3 = [
  'CARGA_CAMPO_REQUERIDO',
  'CARGA_ARCHIVO_REQUERIDO',
  'CARGA_ARCHIVO_NO_SOPORTADO',
  'CARGA_ARCHIVO_MUY_GRANDE',
  'CARGA_FALLO_INESPERADO',
] as const

describe('códigos de error de F3', () => {
  it('registra en el catálogo los códigos de carga de conferencia', () => {
    for (const codigo of CODIGOS_DE_F3) {
      expect(CODIGOS_DE_ERROR).toContain(codigo)
    }
  })

  it('ningún código de F3 cae al mensaje genérico', () => {
    const generico = mensajeDeError(CODIGO_INEXISTENTE)

    for (const codigo of CODIGOS_DE_F3) {
      expect(mensajeDeError(codigo)).not.toBe(generico)
    }
  })

  it('traduce cada código de F3 a un mensaje accionable', () => {
    for (const codigo of CODIGOS_DE_F3) {
      const mensaje = mensajeDeError(codigo)

      expect(mensaje.length).toBeGreaterThan(20)
      expect(mensaje.trim()).toBe(mensaje)
    }
  })

  it('ningún mensaje de F3 filtra un código ni detalle técnico', () => {
    for (const codigo of CODIGOS_DE_F3) {
      const mensaje = mensajeDeError(codigo)

      expect(mensaje).not.toMatch(/_[A-Z]/)
      expect(mensaje.toLowerCase()).not.toContain('undefined')
      expect(mensaje.toLowerCase()).not.toContain('null')
    }
  })
})

/* Códigos del directorio compartido de eventos y ponentes (rediseño de F3). */
const CODIGOS_DE_DIRECTORIO = [
  'DIR_EVENTO_NOMBRE_REQUERIDO',
  'DIR_EVENTO_YA_EXISTE',
  'DIR_EVENTO_NOMBRE_MUY_LARGO',
  'DIR_PONENTE_NOMBRE_REQUERIDO',
  'DIR_PONENTE_YA_EXISTE',
  'DIR_PONENTE_NOMBRE_MUY_LARGO',
] as const

describe('códigos de error del directorio', () => {
  it('registra en el catálogo los códigos de evento y ponente', () => {
    for (const codigo of CODIGOS_DE_DIRECTORIO) {
      expect(CODIGOS_DE_ERROR).toContain(codigo)
    }
  })

  it('ningún código del directorio cae al mensaje genérico', () => {
    const generico = mensajeDeError(CODIGO_INEXISTENTE)

    for (const codigo of CODIGOS_DE_DIRECTORIO) {
      expect(mensajeDeError(codigo)).not.toBe(generico)
    }
  })

  it('traduce cada código del directorio a un mensaje accionable', () => {
    for (const codigo of CODIGOS_DE_DIRECTORIO) {
      const mensaje = mensajeDeError(codigo)

      expect(mensaje.length).toBeGreaterThan(20)
      expect(mensaje.trim()).toBe(mensaje)
    }
  })

  it('ningún mensaje del directorio filtra un código ni detalle técnico', () => {
    for (const codigo of CODIGOS_DE_DIRECTORIO) {
      const mensaje = mensajeDeError(codigo)

      expect(mensaje).not.toMatch(/_[A-Z]/)
      expect(mensaje.toLowerCase()).not.toContain('undefined')
      expect(mensaje.toLowerCase()).not.toContain('null')
    }
  })
})
