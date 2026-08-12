import { LARGO_MAXIMO_DE_PLANTILLA, TAMANO_MAXIMO_DE_IMAGEN_MB } from '@/shared/errors'
import type { CodigoError } from '@/shared/errors'
import { limitarALienzo } from './geometria/geometria'
import { CAMPOS_DE_MARCADOR, DATOS_DE_EJEMPLO } from './data'
import type { CampoDeMarcador, ElementoDePlantilla, FormatoDeMarcador, Plantilla, Rectangulo } from './data'

/*
  Operaciones puras sobre una plantilla. Mismo contrato que
  `directorio/directorio.ts`: nunca lanzan, nunca mutan lo que reciben, el
  fallo viaja como código de error.
*/

export type ResultadoPlantilla =
  | { readonly ok: true; readonly plantilla: Plantilla }
  | { readonly ok: false; readonly codigo: CodigoError }

function idAleatorio(prefijo: string): string {
  const uuid = globalThis.crypto?.randomUUID?.()
  if (uuid !== undefined) {
    return `${prefijo}-${uuid}`
  }

  return `${prefijo}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function crearPlantillaEnBlanco(): Plantilla {
  return {
    id: idAleatorio('pla'),
    nombre: 'Plantilla sin nombre',
    colorPrincipal: '#2f5fdb',
    colorSecundario: '#5b6472',
    elementos: [],
    actualizadaEl: new Date().toISOString(),
  }
}

export function renombrarPlantilla(plantilla: Plantilla, nombre: string): ResultadoPlantilla {
  const limpio = nombre.trim()

  if (limpio.length === 0) {
    return { ok: false, codigo: 'PLANT_NOMBRE_REQUERIDO' }
  }

  if (limpio.length > LARGO_MAXIMO_DE_PLANTILLA) {
    return { ok: false, codigo: 'PLANT_NOMBRE_MUY_LARGO' }
  }

  return { ok: true, plantilla: { ...plantilla, nombre: limpio, actualizadaEl: new Date().toISOString() } }
}

export function cambiarColores(
  plantilla: Plantilla,
  colorPrincipal: string,
  colorSecundario: string,
): Plantilla {
  return { ...plantilla, colorPrincipal, colorSecundario, actualizadaEl: new Date().toISOString() }
}

/*
  Posición/tamaño con los que arranca un elemento nuevo, en cascada según
  cuántos elementos ya tiene la plantilla: si dos elementos nacieran siempre
  en el mismo lugar, el segundo taparía por completo al primero (ambos con el
  mismo tamaño exacto) y no habría forma de tomarlo con el puntero hasta
  arrastrar el de encima primero. El módulo de 6 evita que seguir agregando
  empuje el elemento fuera del lienzo; `limitarALienzo` es la red de
  seguridad final.
*/
function posicionEnCascada(base: Rectangulo, numeroDeElementos: number): Rectangulo {
  const paso = 0.04 * (numeroDeElementos % 6)

  return limitarALienzo({ ...base, x: base.x + paso, y: base.y + paso })
}

const POSICION_BASE: Rectangulo = { x: 0.1, y: 0.1, ancho: 0.3, alto: 0.08 }
const POSICION_BASE_IMAGEN: Rectangulo = { x: 0.1, y: 0.1, ancho: 0.25, alto: 0.25 }

function conElementoAgregado(plantilla: Plantilla, elemento: ElementoDePlantilla): Plantilla {
  return {
    ...plantilla,
    elementos: [...plantilla.elementos, elemento],
    actualizadaEl: new Date().toISOString(),
  }
}

export function agregarElementoDeTexto(plantilla: Plantilla): Plantilla {
  return conElementoAgregado(plantilla, {
    id: idAleatorio('el'),
    tipo: 'texto',
    rol: 'cuerpo',
    contenido: '',
    posicion: posicionEnCascada(POSICION_BASE, plantilla.elementos.length),
  })
}

export function agregarElementoDeImagen(
  plantilla: Plantilla,
  url: string,
  nombreDeArchivo: string,
): Plantilla {
  return conElementoAgregado(plantilla, {
    id: idAleatorio('el'),
    tipo: 'imagen',
    url,
    nombreDeArchivo,
    posicion: posicionEnCascada(POSICION_BASE_IMAGEN, plantilla.elementos.length),
  })
}

export function agregarElementoDeMarcador(
  plantilla: Plantilla,
  campo: CampoDeMarcador = CAMPOS_DE_MARCADOR[0] ?? 'tema_principal',
  formato: FormatoDeMarcador = 'parrafo',
): Plantilla {
  return conElementoAgregado(plantilla, {
    id: idAleatorio('el'),
    tipo: 'marcador',
    campo,
    formato,
    posicion: posicionEnCascada(POSICION_BASE, plantilla.elementos.length),
  })
}

export function actualizarElemento(
  plantilla: Plantilla,
  idElemento: string,
  cambios: Partial<ElementoDePlantilla>,
): Plantilla {
  const yaExiste = plantilla.elementos.some((elemento) => elemento.id === idElemento)
  if (!yaExiste) {
    return plantilla
  }

  return {
    ...plantilla,
    elementos: plantilla.elementos.map((elemento) =>
      elemento.id === idElemento ? ({ ...elemento, ...cambios } as ElementoDePlantilla) : elemento,
    ),
    actualizadaEl: new Date().toISOString(),
  }
}

export function quitarElemento(plantilla: Plantilla, idElemento: string): Plantilla {
  return {
    ...plantilla,
    elementos: plantilla.elementos.filter((elemento) => elemento.id !== idElemento),
    actualizadaEl: new Date().toISOString(),
  }
}

const TIPOS_DE_IMAGEN_ACEPTADOS = ['image/png', 'image/jpeg', 'image/webp']

export function validarImagen(archivo: File): { ok: true } | { ok: false; codigo: CodigoError } {
  if (!TIPOS_DE_IMAGEN_ACEPTADOS.includes(archivo.type)) {
    return { ok: false, codigo: 'PLANT_IMAGEN_NO_SOPORTADA' }
  }

  if (archivo.size > TAMANO_MAXIMO_DE_IMAGEN_MB * 1024 * 1024) {
    return { ok: false, codigo: 'PLANT_IMAGEN_MUY_GRANDE' }
  }

  return { ok: true }
}

export function resolverMarcador(
  campo: CampoDeMarcador,
  formato: FormatoDeMarcador,
): string | readonly string[] {
  return DATOS_DE_EJEMPLO[campo][formato]
}
