/*
  Revelado de una respuesta ya compuesta, por tiempo real transcurrido — mismo
  espíritu que `conferencias/carga/progreso.ts`/`memorias/progreso.ts`
  (`Date.now()` real, sin `setTimeout` falso), pero mapeado a **contenido**
  visible en vez de a un porcentaje: aquella barra era pura decoración sobre
  un resultado que ya existía completo, y no revelaba nada; aquí sí importa
  cuánto texto se ve en cada instante, porque es lo que la persona está
  leyendo mientras "genera".
*/

export const CARACTERES_POR_SEGUNDO = 45

export function textoVisibleDe(textoCompleto: string, inicioMs: number, ahoraMs: number): string {
  const transcurridoS = Math.max(0, (ahoraMs - inicioMs) / 1000)
  const caracteresVisibles = Math.floor(transcurridoS * CARACTERES_POR_SEGUNDO)

  return textoCompleto.slice(0, Math.min(caracteresVisibles, textoCompleto.length))
}

export function generacionCompleta(textoCompleto: string, inicioMs: number, ahoraMs: number): boolean {
  return textoVisibleDe(textoCompleto, inicioMs, ahoraMs).length >= textoCompleto.length
}
