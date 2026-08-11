/*
  Acceso tolerante a fallos a `sessionStorage`.

  Estos cuatro helpers nacieron dentro de la sesión simulada de F1 y salieron
  aquí cuando las etiquetas personales de F2 necesitaron exactamente el mismo
  `try/catch`. La alternativa era copiarlo, y F4 lo habría pedido por tercera
  vez.

  Se usa `sessionStorage` y no `localStorage` en todo el proyecto: lo que se
  guarda acompaña a la pestaña, no al navegador.

  Toda interacción con el almacenamiento va dentro del try, incluida la
  lectura: en un iframe con zona de pruebas o en ciertos webviews, `getItem`
  también puede lanzar, y estas funciones corren dentro de inicializadores de
  `useState`. Si la excepción escapara, la aplicación entera se quedaría en
  blanco.
*/

export function almacenamientoDisponible(): Storage | null {
  try {
    return globalThis.sessionStorage ?? null
  } catch {
    /* Acceso bloqueado por la configuración del navegador. */
    return null
  }
}

/** Lee y descarta en silencio cualquier valor corrupto, borrando la clave rota. */
export function leerJson(clave: string): unknown {
  const almacenamiento = almacenamientoDisponible()

  if (almacenamiento === null) {
    return null
  }

  try {
    const crudo = almacenamiento.getItem(clave)

    if (crudo === null) {
      return null
    }

    return JSON.parse(crudo)
  } catch {
    borrarClave(clave)
    return null
  }
}

export function escribirJson(clave: string, valor: unknown): void {
  const almacenamiento = almacenamientoDisponible()

  if (almacenamiento === null) {
    return
  }

  try {
    almacenamiento.setItem(clave, JSON.stringify(valor))
  } catch {
    /* Cuota llena o modo privado: el estado sigue vivo en memoria. */
  }
}

export function borrarClave(clave: string): void {
  const almacenamiento = almacenamientoDisponible()

  if (almacenamiento === null) {
    return
  }

  try {
    almacenamiento.removeItem(clave)
  } catch {
    /* Nada que hacer: el estado en memoria ya se limpió. */
  }
}
