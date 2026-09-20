import type { Ficha } from '../data'

/*
  Cual de los dos textos de una ficha se lee.

  Una ficha guarda dos versiones de lo mismo: el `fragmento`, que es lo que se
  dijo palabra por palabra, y el `condensado`, que es la misma idea sin las
  repeticiones del habla. La que se ensena por defecto es la condensada, y no
  al contrario, porque el habla real repite: "la resolucion es la resolucion
  que viene por derecho de norma, esa es la resolucion que se menciona aqui"
  dicho se entiende, leido no dice nada.

  Lo literal no se esconde ni se pierde: sigue a un clic, y es lo que se cita.

  Estas dos funciones existen para que ninguna pantalla vuelva a escribir
  `ficha.condensado || ficha.fragmento` por su cuenta. Que una lista mostrara
  la condensada y su detalle la literal seria el peor de los resultados: dos
  textos distintos para la misma ficha, sin nada que explique por que.
*/

/** El texto que se lee: el condensado si lo hay, la literal si no. */
export function textoDeFicha(ficha: Ficha): string {
  return ficha.condensado === '' ? ficha.fragmento : ficha.condensado
}

/**
 * Si esta ficha tiene una version condensada distinta de la literal.
 *
 * Es la condicion para ofrecer el "como se dijo": sin condensado no hay dos
 * versiones que comparar, y un boton que abriera un modal con el mismo texto
 * dos veces prometeria algo que no esta ahi.
 */
export function fueCondensada(ficha: Ficha): boolean {
  return ficha.condensado !== ''
}
