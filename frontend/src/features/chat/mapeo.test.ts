import { describe, expect, it } from 'vitest'
import type { Conversacion, MensajeNuevo, PasoDeRazonamiento } from './data/tipos'
import {
  conversacionDeFila,
  filaDeMensajeNuevo,
  mensajeDeFila,
  ordenarPorActividad,
} from './mapeo'
import type { FilaDeConversacion, FilaDeMensaje } from './mapeo'

/*
  El mapeo es donde se decide si la unión discriminada del dominio sobrevive al
  viaje a una tabla que la representa con nueve columnas anulables. Las pruebas
  van fila por fila, incluidas las filas que el `check` de la tabla no dejaría
  existir: son justo las que ninguna prueba contra la base real podría escribir.
*/

const ID_CONVERSACION = '1a5b8c7d-0e2f-4a3b-9c4d-5e6f7a8b9c0d'

function filaDeMensajeBase(): FilaDeMensaje {
  return {
    id: 'f0e1d2c3-b4a5-4968-8778-99aabbccddee',
    id_conversacion: ID_CONVERSACION,
    rol: 'usuario',
    tipo: null,
    contenido: null,
    ids_fichas_citadas: null,
    pasos_de_razonamiento: null,
    pregunta: null,
    opciones: null,
    creado_el: '2026-09-07T10:00:00.000Z',
  }
}

function filaDeConversacionBase(): FilaDeConversacion {
  return {
    id: ID_CONVERSACION,
    id_usuario: 'ad474b7c-4a6e-4092-8c7e-ccf8701d9178',
    titulo: 'Sesgos algorítmicos',
    alcance: { tipo: 'todas' },
    creada_el: '2026-09-07T09:00:00.000Z',
    actualizada_el: '2026-09-07T10:00:00.000Z',
  }
}

function conversacionEn(id: string, actualizadaEl: string): Conversacion {
  return {
    id,
    idUsuario: 'ad474b7c-4a6e-4092-8c7e-ccf8701d9178',
    titulo: id,
    alcance: { tipo: 'todas' },
    creadaEl: '2026-09-07T09:00:00.000Z',
    actualizadaEl,
  }
}

describe('conversacionDeFila', () => {
  it('traduce las columnas en snake_case a los nombres del dominio', () => {
    const conversacion = conversacionDeFila(filaDeConversacionBase())

    expect(conversacion).toEqual({
      id: ID_CONVERSACION,
      idUsuario: 'ad474b7c-4a6e-4092-8c7e-ccf8701d9178',
      titulo: 'Sesgos algorítmicos',
      alcance: { tipo: 'todas' },
      creadaEl: '2026-09-07T09:00:00.000Z',
      actualizadaEl: '2026-09-07T10:00:00.000Z',
    })
  })

  it('conserva un alcance de selección con sus conferencias', () => {
    const conversacion = conversacionDeFila({
      ...filaDeConversacionBase(),
      alcance: { tipo: 'seleccion', idsConferencias: ['cnf-1', 'cnf-2'] },
    })

    expect(conversacion.alcance).toEqual({ tipo: 'seleccion', idsConferencias: ['cnf-1', 'cnf-2'] })
  })

  it('conserva un alcance de filtro con tema nulo', () => {
    const conversacion = conversacionDeFila({
      ...filaDeConversacionBase(),
      alcance: { tipo: 'filtro', idTema: null, palabraClave: 'sesgos' },
    })

    expect(conversacion.alcance).toEqual({ tipo: 'filtro', idTema: null, palabraClave: 'sesgos' })
  })

  it('cae al alcance más amplio cuando el jsonb no describe ningún alcance válido', () => {
    const conversacion = conversacionDeFila({ ...filaDeConversacionBase(), alcance: { tipo: 'inventado' } })

    expect(conversacion.alcance).toEqual({ tipo: 'todas' })
  })

  it('no esconde la conversación por tener el alcance corrupto', () => {
    const conversacion = conversacionDeFila({ ...filaDeConversacionBase(), alcance: 'no es un objeto' })

    expect(conversacion.titulo).toBe('Sesgos algorítmicos')
  })
})

describe('mensajeDeFila', () => {
  it('lee un mensaje de usuario: contenido lleno y tipo nulo', () => {
    const mensaje = mensajeDeFila({ ...filaDeMensajeBase(), contenido: '¿Qué se dijo sobre sesgos?' })

    expect(mensaje).toEqual({
      id: 'f0e1d2c3-b4a5-4968-8778-99aabbccddee',
      idConversacion: ID_CONVERSACION,
      creadoEl: '2026-09-07T10:00:00.000Z',
      rol: 'usuario',
      contenido: '¿Qué se dijo sobre sesgos?',
    })
  })

  it('lee una respuesta conservando exactamente los ids de las fichas citadas', () => {
    const mensaje = mensajeDeFila({
      ...filaDeMensajeBase(),
      rol: 'asistente',
      tipo: 'respuesta',
      contenido: 'Encontré 3 fichas relacionadas.',
      ids_fichas_citadas: ['fch-alc-01-01', 'fch-alc-01-02', 'fch-alc-01-01'],
      pasos_de_razonamiento: [{ descripcion: 'Alcance', descartadas: [], totalDescartadas: 0 }],
    })

    /* Ni deduplicadas ni reordenadas: son las citas tal como las emitió quien respondió. */
    expect(mensaje).toMatchObject({
      rol: 'asistente',
      tipo: 'respuesta',
      idsFichasCitadas: ['fch-alc-01-01', 'fch-alc-01-02', 'fch-alc-01-01'],
    })
  })

  it('trata una respuesta sin citas como una lista vacía, no como una respuesta rota', () => {
    const mensaje = mensajeDeFila({
      ...filaDeMensajeBase(),
      rol: 'asistente',
      tipo: 'respuesta',
      contenido: 'No encontré nada en ese alcance.',
      ids_fichas_citadas: null,
    })

    expect(mensaje).toMatchObject({ tipo: 'respuesta', idsFichasCitadas: [], pasosDeRazonamiento: [] })
  })

  it('conserva los pasos de razonamiento con sus descartes', () => {
    const paso: PasoDeRazonamiento = {
      descripcion: 'Buscando fichas que mencionen "sesgos"',
      descartadas: [{ idFicha: 'fch-alc-01-09', motivo: 'no menciona "sesgos"' }],
      totalDescartadas: 12,
    }

    const mensaje = mensajeDeFila({
      ...filaDeMensajeBase(),
      rol: 'asistente',
      tipo: 'respuesta',
      contenido: 'Encontré 1 ficha.',
      ids_fichas_citadas: ['fch-alc-01-01'],
      pasos_de_razonamiento: [paso],
    })

    expect(mensaje).toMatchObject({ pasosDeRazonamiento: [paso] })
  })

  it('descarta un paso de razonamiento con forma inválida sin perder el resto de la respuesta', () => {
    const mensaje = mensajeDeFila({
      ...filaDeMensajeBase(),
      rol: 'asistente',
      tipo: 'respuesta',
      contenido: 'Encontré 1 ficha.',
      ids_fichas_citadas: ['fch-alc-01-01'],
      pasos_de_razonamiento: [{ descripcion: 'sin totalDescartadas', descartadas: [] }, 'texto suelto'],
    })

    expect(mensaje).toMatchObject({ contenido: 'Encontré 1 ficha.', pasosDeRazonamiento: [] })
  })

  it('lee una aclaración: pregunta y opciones, sin contenido', () => {
    const mensaje = mensajeDeFila({
      ...filaDeMensajeBase(),
      rol: 'asistente',
      tipo: 'aclaracion',
      pregunta: '¿Acoto por alguno de estos?',
      opciones: [{ etiqueta: 'Tema: Ética', alcance: { tipo: 'filtro', idTema: 'tem-1', palabraClave: 'sesgos' } }],
    })

    expect(mensaje).toEqual({
      id: 'f0e1d2c3-b4a5-4968-8778-99aabbccddee',
      idConversacion: ID_CONVERSACION,
      creadoEl: '2026-09-07T10:00:00.000Z',
      rol: 'asistente',
      tipo: 'aclaracion',
      pregunta: '¿Acoto por alguno de estos?',
      opciones: [{ etiqueta: 'Tema: Ética', alcance: { tipo: 'filtro', idTema: 'tem-1', palabraClave: 'sesgos' } }],
    })
  })

  it('descarta una opción de aclaración cuyo alcance no es válido', () => {
    const mensaje = mensajeDeFila({
      ...filaDeMensajeBase(),
      rol: 'asistente',
      tipo: 'aclaracion',
      pregunta: '¿Acoto?',
      opciones: [{ etiqueta: 'Rota', alcance: { tipo: 'no-existe' } }],
    })

    expect(mensaje).toMatchObject({ tipo: 'aclaracion', opciones: [] })
  })

  it('devuelve null ante un mensaje de usuario sin contenido', () => {
    expect(mensajeDeFila(filaDeMensajeBase())).toBeNull()
  })

  it('devuelve null ante una respuesta sin contenido', () => {
    expect(mensajeDeFila({ ...filaDeMensajeBase(), rol: 'asistente', tipo: 'respuesta' })).toBeNull()
  })

  it('devuelve null ante una aclaración sin pregunta', () => {
    expect(mensajeDeFila({ ...filaDeMensajeBase(), rol: 'asistente', tipo: 'aclaracion' })).toBeNull()
  })

  it('devuelve null ante un rol que el dominio no conoce', () => {
    expect(mensajeDeFila({ ...filaDeMensajeBase(), rol: 'sistema', contenido: 'hola' })).toBeNull()
  })

  it('devuelve null ante un asistente sin tipo, que el check no permitiría guardar', () => {
    expect(mensajeDeFila({ ...filaDeMensajeBase(), rol: 'asistente', contenido: 'hola' })).toBeNull()
  })
})

describe('filaDeMensajeNuevo', () => {
  it('escribe un mensaje de usuario con tipo nulo y sin columnas de asistente', () => {
    const fila = filaDeMensajeNuevo(ID_CONVERSACION, { rol: 'usuario', contenido: 'hola' })

    expect(fila).toEqual({
      id_conversacion: ID_CONVERSACION,
      rol: 'usuario',
      tipo: null,
      contenido: 'hola',
      ids_fichas_citadas: null,
      pasos_de_razonamiento: null,
      pregunta: null,
      opciones: null,
    })
  })

  it('escribe una respuesta con sus citas y deja en nulo pregunta y opciones', () => {
    const nuevo: MensajeNuevo = {
      rol: 'asistente',
      tipo: 'respuesta',
      contenido: 'Encontré 2 fichas.',
      idsFichasCitadas: ['fch-alc-01-01', 'fch-alc-01-02'],
      pasosDeRazonamiento: [{ descripcion: 'Alcance', descartadas: [], totalDescartadas: 0 }],
    }

    expect(filaDeMensajeNuevo(ID_CONVERSACION, nuevo)).toEqual({
      id_conversacion: ID_CONVERSACION,
      rol: 'asistente',
      tipo: 'respuesta',
      contenido: 'Encontré 2 fichas.',
      ids_fichas_citadas: ['fch-alc-01-01', 'fch-alc-01-02'],
      pasos_de_razonamiento: [{ descripcion: 'Alcance', descartadas: [], totalDescartadas: 0 }],
      pregunta: null,
      opciones: null,
    })
  })

  it('escribe una aclaración sin contenido ni citas, como exige el check', () => {
    const nuevo: MensajeNuevo = {
      rol: 'asistente',
      tipo: 'aclaracion',
      pregunta: '¿Acoto por alguno de estos?',
      opciones: [{ etiqueta: 'Tema: Ética', alcance: { tipo: 'todas' } }],
    }

    expect(filaDeMensajeNuevo(ID_CONVERSACION, nuevo)).toEqual({
      id_conversacion: ID_CONVERSACION,
      rol: 'asistente',
      tipo: 'aclaracion',
      contenido: null,
      ids_fichas_citadas: null,
      pasos_de_razonamiento: null,
      pregunta: '¿Acoto por alguno de estos?',
      opciones: [{ etiqueta: 'Tema: Ética', alcance: { tipo: 'todas' } }],
    })
  })

  it('nombra siempre las nueve columnas, para que ninguna quede con un valor heredado', () => {
    const fila = filaDeMensajeNuevo(ID_CONVERSACION, { rol: 'usuario', contenido: 'hola' })

    expect(Object.keys(fila).sort()).toEqual(
      [
        'contenido',
        'id_conversacion',
        'ids_fichas_citadas',
        'opciones',
        'pasos_de_razonamiento',
        'pregunta',
        'rol',
        'tipo',
      ].sort(),
    )
  })

  it('sobrevive el viaje de ida y vuelta conservando las citas', () => {
    const fila = filaDeMensajeNuevo(ID_CONVERSACION, {
      rol: 'asistente',
      tipo: 'respuesta',
      contenido: 'Encontré 2 fichas.',
      idsFichasCitadas: ['fch-alc-01-01', 'fch-alc-01-02'],
      pasosDeRazonamiento: [],
    })

    const devuelto = mensajeDeFila({
      ...fila,
      id: 'f0e1d2c3-b4a5-4968-8778-99aabbccddee',
      creado_el: '2026-09-07T10:00:00.000Z',
    })

    expect(devuelto).toMatchObject({
      tipo: 'respuesta',
      contenido: 'Encontré 2 fichas.',
      idsFichasCitadas: ['fch-alc-01-01', 'fch-alc-01-02'],
    })
  })
})

describe('ordenarPorActividad', () => {
  it('pone primero la conversación con actividad más reciente', () => {
    const ordenadas = ordenarPorActividad([
      conversacionEn('vieja', '2026-09-01T10:00:00.000Z'),
      conversacionEn('nueva', '2026-09-07T10:00:00.000Z'),
      conversacionEn('media', '2026-09-04T10:00:00.000Z'),
    ])

    expect(ordenadas.map((conversacion) => conversacion.id)).toEqual(['nueva', 'media', 'vieja'])
  })

  it('desempata por id para que el orden no cambie entre renders', () => {
    const mismaMarca = '2026-09-07T10:00:00.000Z'
    const unOrden = ordenarPorActividad([conversacionEn('aaa', mismaMarca), conversacionEn('bbb', mismaMarca)])
    const otroOrden = ordenarPorActividad([conversacionEn('bbb', mismaMarca), conversacionEn('aaa', mismaMarca)])

    expect(unOrden.map((conversacion) => conversacion.id)).toEqual(otroOrden.map((conversacion) => conversacion.id))
  })

  it('no modifica el arreglo que recibe', () => {
    const original = [conversacionEn('vieja', '2026-09-01T10:00:00.000Z'), conversacionEn('nueva', '2026-09-07T10:00:00.000Z')]
    ordenarPorActividad(original)

    expect(original.map((conversacion) => conversacion.id)).toEqual(['vieja', 'nueva'])
  })
})
