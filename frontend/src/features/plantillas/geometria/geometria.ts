/*
  Posición y tamaño de un elemento del lienzo, como fracción (0-1) del propio
  lienzo, no en píxeles: así el layout no depende de a qué resolución se
  termine exportando el documento (ver `plan-design.md` de F4).
*/
export type Rectangulo = {
  readonly x: number
  readonly y: number
  readonly ancho: number
  readonly alto: number
}

/* Un elemento nunca queda en tamaño cero: seguiría existiendo pero sería imposible volver a tomarlo con el puntero. */
export const TAMANO_MINIMO = 0.03

function acotar(valor: number, minimo: number, maximo: number): number {
  return Math.min(maximo, Math.max(minimo, valor))
}

/*
  Único lugar donde vive la lógica de límites del lienzo. El tamaño se acota
  primero contra el lienzo completo (0-1) y luego la posición se acota para
  que ese tamaño, ya fijo, quepa entero — en ese orden, para que mover un
  elemento nunca lo deforme (su tamaño ya es válido, solo se topa la
  posición) y redimensionarlo nunca lo desplace en el caso normal (su
  posición ya es válida, solo se topa el tamaño). Solo en un desborde extremo
  de tamaño (mayor que el lienzo entero) la posición también cede, porque ya
  no hay forma de mantener ambas cosas a la vez.
*/
export function limitarALienzo(rect: Rectangulo): Rectangulo {
  const ancho = acotar(rect.ancho, TAMANO_MINIMO, 1)
  const alto = acotar(rect.alto, TAMANO_MINIMO, 1)
  const x = acotar(rect.x, 0, 1 - ancho)
  const y = acotar(rect.y, 0, 1 - alto)

  return { x, y, ancho, alto }
}

export function moverElemento(rect: Rectangulo, deltaX: number, deltaY: number): Rectangulo {
  return limitarALienzo({ ...rect, x: rect.x + deltaX, y: rect.y + deltaY })
}

export function redimensionarElemento(rect: Rectangulo, deltaAncho: number, deltaAlto: number): Rectangulo {
  return limitarALienzo({ ...rect, ancho: rect.ancho + deltaAncho, alto: rect.alto + deltaAlto })
}
