/*
  Iniciales para el círculo de cuenta: primera letra de las dos primeras
  palabras del nombre. Con una sola palabra, sus dos primeras letras. Sin
  nombre (cuenta creada antes de que `full_name` existiera, por ejemplo), la
  inicial del correo. Nunca deja el círculo vacío.
*/
export function inicialesDe(nombre: string, correo: string): string {
  const partes = nombre
    .trim()
    .split(/\s+/)
    .filter((parte) => parte.length > 0)
  const [primero, segundo] = partes

  if (primero !== undefined && segundo !== undefined) {
    return `${primero.charAt(0)}${segundo.charAt(0)}`.toUpperCase()
  }

  if (primero !== undefined) {
    return primero.slice(0, 2).toUpperCase()
  }

  const inicialDeCorreo = correo.trim().charAt(0)
  return inicialDeCorreo === '' ? '?' : inicialDeCorreo.toUpperCase()
}
