import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { supabase } from '@/shared/supabase/cliente'
import {
  mockearBucket,
  mockearFalloDeTabla,
  mockearTabla,
  reiniciarMocksDeDatos,
} from '@/test/supabaseDePrueba'
import {
  actualizarEstadoDeValidacion,
  crearConferencia,
  listarConferencias,
  listarFichasDe,
  obtenerConferencia,
  rutaDeAudio,
} from './repositorio'

vi.mock('@/shared/supabase/cliente')

const FILA_DE_CONFERENCIA = {
  id: 'conf-1',
  titulo: 'Sesgos en modelos de predicción',
  ponente: 'Mariana Escobar',
  evento: 'Jornadas de IA Aplicada',
  codigo_de_evento: 'JIA-2026-03',
  fecha_del_evento: '2026-05-14',
  duracion_en_segundos: 2700,
  id_dueno: 'usuario-1',
  estado: 'procesada',
  id_tema_principal: 'tema-1',
  resumen: 'Resumen.',
  fuente: 'audio',
  cargada_el: null,
  comparticiones: [],
}

const FILA_DE_FICHA = {
  id: 'ficha-1',
  id_conferencia: 'conf-1',
  fragmento: 'El dato nunca es neutral.',
  hablante: 'Mariana Escobar',
  segundo_inicio: 120,
  segundo_fin: 148,
  id_tema: 'tema-1',
  tipo_de_unidad: 'cita-textual',
  estado_de_validacion: 'validada',
  confianza_automatica: 0.94,
  contexto_minimo: 'Contexto.',
}

const DATOS_DE_CARGA = {
  titulo: 'Charla nueva',
  ponente: 'Rodrigo Peñaloza',
  evento: 'Jornadas de IA Aplicada',
  codigoDeEvento: 'JIA-2026-09',
  fechaDelEvento: '2026-09-01',
  idDueno: 'usuario-1',
  fuente: 'audio',
} as const

beforeEach(() => {
  reiniciarMocksDeDatos()
  mockearBucket()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('listarConferencias', () => {
  it('devuelve las conferencias ya mapeadas al tipo del dominio', async () => {
    mockearTabla('conferencias', [FILA_DE_CONFERENCIA])

    const resultado = await listarConferencias()

    expect(resultado).toEqual({
      ok: true,
      datos: [expect.objectContaining({ id: 'conf-1', codigoDeEvento: 'JIA-2026-03' })],
    })
  })

  it('sin filas devuelve una lista vacía, no un fallo', async () => {
    mockearTabla('conferencias', [])

    await expect(listarConferencias()).resolves.toEqual({ ok: true, datos: [] })
  })

  /*
    Una fila corrupta no puede tumbar el listado entero: las demás se siguen
    viendo. Es la contrapartida de que el mapeo descarte en vez de lanzar.
  */
  it('descarta una fila que el dominio no sabe interpretar y conserva el resto', async () => {
    mockearTabla('conferencias', [
      FILA_DE_CONFERENCIA,
      { ...FILA_DE_CONFERENCIA, id: 'conf-2', estado: 'archivada' },
    ])

    const resultado = await listarConferencias()

    expect(resultado.ok && resultado.datos).toHaveLength(1)
  })

  it('traduce un rechazo de RLS a un código del catálogo, sin exponer el de Postgres', async () => {
    mockearFalloDeTabla('conferencias', '42501')

    await expect(listarConferencias()).resolves.toEqual({ ok: false, codigo: 'DATOS_SIN_PERMISO' })
  })

  it('traduce una caída de red', async () => {
    mockearFalloDeTabla('conferencias', '', 'TypeError: Failed to fetch')

    await expect(listarConferencias()).resolves.toEqual({ ok: false, codigo: 'DATOS_SIN_CONEXION' })
  })
})

describe('obtenerConferencia', () => {
  it('devuelve la conferencia cuando existe y la sesión puede verla', async () => {
    mockearTabla('conferencias', FILA_DE_CONFERENCIA)

    const resultado = await obtenerConferencia('conf-1')

    expect(resultado.ok && resultado.datos.id).toBe('conf-1')
  })

  /*
    Que existir-pero-no-verse y no-existir devuelvan lo mismo es deliberado:
    distinguirlos convertiría el detalle en un oráculo para averiguar qué ha
    subido otra persona probando identificadores.
  */
  it('una conferencia que RLS no deja ver es indistinguible de una que no existe', async () => {
    mockearTabla('conferencias', null)

    await expect(obtenerConferencia('conf-ajena')).resolves.toEqual({
      ok: false,
      codigo: 'CONF_NO_ENCONTRADA',
    })
  })

  it('una fila que no se puede mapear se reporta como no encontrada', async () => {
    mockearTabla('conferencias', { ...FILA_DE_CONFERENCIA, fuente: 'video' })

    await expect(obtenerConferencia('conf-1')).resolves.toEqual({
      ok: false,
      codigo: 'CONF_NO_ENCONTRADA',
    })
  })
})

describe('listarFichasDe', () => {
  it('devuelve las fichas mapeadas, con su coordenada en la fuente', async () => {
    mockearTabla('fichas', [FILA_DE_FICHA])

    const resultado = await listarFichasDe('conf-1')

    expect(resultado.ok && resultado.datos[0]).toMatchObject({
      idConferencia: 'conf-1',
      segundoInicio: 120,
      segundoFin: 148,
    })
  })

  it('propaga el fallo traducido', async () => {
    mockearFalloDeTabla('fichas', '42501')

    await expect(listarFichasDe('conf-1')).resolves.toEqual({
      ok: false,
      codigo: 'DATOS_SIN_PERMISO',
    })
  })
})

describe('actualizarEstadoDeValidacion', () => {
  it('reporta éxito cuando Postgres acepta la escritura', async () => {
    mockearTabla('fichas', null)

    await expect(actualizarEstadoDeValidacion('ficha-1', 'validada')).resolves.toEqual({
      ok: true,
      datos: null,
    })
  })

  /*
    Quién puede validar lo decide la política de RLS, no el cliente. Aquí solo
    se comprueba que su rechazo llega traducido a un mensaje accionable en vez
    de pasar como si la validación hubiera funcionado.
  */
  it('un rechazo de la política de validación llega como falta de permiso', async () => {
    mockearFalloDeTabla('fichas', '42501')

    await expect(actualizarEstadoDeValidacion('ficha-1', 'validada')).resolves.toEqual({
      ok: false,
      codigo: 'DATOS_SIN_PERMISO',
    })
  })
})

describe('rutaDeAudio', () => {
  /*
    El primer segmento tiene que ser el id del dueño: la política de Storage
    compara `storage.foldername(name)[1]` contra `auth.uid()`. Cualquier otro
    orden hace que la subida sea rechazada.
  */
  it('pone al dueño como primer segmento, que es lo que exige la política del bucket', () => {
    expect(rutaDeAudio('usuario-1', 'conf-1', 'charla.mp3')).toBe('usuario-1/conf-1/charla.mp3')
  })
})

describe('crearConferencia', () => {
  it('inserta la fila y sube el audio a la carpeta del dueño', async () => {
    mockearTabla('conferencias', FILA_DE_CONFERENCIA)
    const bucket = mockearBucket()
    const archivo = new File(['audio'], 'charla.mp3', { type: 'audio/mpeg' })

    const resultado = await crearConferencia(DATOS_DE_CARGA, archivo)

    expect(resultado.ok).toBe(true)
    expect(bucket.upload).toHaveBeenCalledWith('usuario-1/conf-1/charla.mp3', archivo)
  })

  it('sin archivo (transcripción pegada) no toca Storage', async () => {
    mockearTabla('conferencias', FILA_DE_CONFERENCIA)
    const bucket = mockearBucket()

    await crearConferencia({ ...DATOS_DE_CARGA, fuente: 'transcripcion' }, null)

    expect(bucket.upload).not.toHaveBeenCalled()
  })

  /*
    La compensación es lo que evita una conferencia fantasma: sin ella
    quedaría una fila `en-cola` cuyo audio no existe, que el análisis nunca
    podría procesar y que nadie sabría explicar.
  */
  it('si la subida del audio falla, borra la fila para no dejar una conferencia sin audio', async () => {
    mockearTabla('conferencias', FILA_DE_CONFERENCIA)
    vi.mocked(supabase.storage.from).mockReturnValue({
      upload: vi.fn().mockResolvedValue({ data: null, error: { message: 'cuota llena' } }),
    } as never)

    const resultado = await crearConferencia(DATOS_DE_CARGA, new File(['a'], 'charla.mp3'))

    /*
      Código propio y no el genérico: que el almacenamiento rechace el archivo
      pide cambiar el archivo, no reintentar, y con el mismo mensaje que un
      fallo de escritura el consejo salía siempre equivocado para uno de los dos.
    */
    expect(resultado).toEqual({ ok: false, codigo: 'CARGA_ARCHIVO_RECHAZADO' })
    expect(vi.mocked(supabase.from)).toHaveBeenCalledWith('conferencias')
  })

  it('si la inserción falla, no intenta subir nada', async () => {
    mockearFalloDeTabla('conferencias', '42501')
    const bucket = mockearBucket()

    const resultado = await crearConferencia(DATOS_DE_CARGA, new File(['a'], 'charla.mp3'))

    expect(resultado.ok).toBe(false)
    expect(bucket.upload).not.toHaveBeenCalled()
  })
})
