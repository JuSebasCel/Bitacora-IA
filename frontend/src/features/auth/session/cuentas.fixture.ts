/*
  Cuentas de ejemplo de la sesión simulada del módulo F1. No hay red ni Supabase
  todavía: estas credenciales existen solo para poder recorrer el shell de la
  aplicación de punta a punta. Los correos se guardan ya normalizados, en
  minúsculas y sin espacios, porque la comparación al acceder normaliza igual.

  AVISO DE SEGURIDAD, a resolver en B1
  ------------------------------------
  Estas contraseñas están en texto plano y viajan al bundle del frontend, así
  que cualquiera puede leerlas abriendo las herramientas del navegador. Es
  aceptable únicamente porque son credenciales ficticias de un módulo sin
  backend, y porque la aplicación todavía no protege ningún dato real.

  Cuando entre la autenticación real (módulo B1, Supabase Auth), este archivo se
  BORRA junto con `credenciales.ts` y la rama de cuentas registradas del
  provider. No se adapta ni se reutiliza: la sección 4 de CLAUDE.md prohíbe
  cualquier credencial en el bundle del frontend.
*/

export type CuentaDeEjemplo = {
  id: string
  nombre: string
  correo: string
  contrasena: string
}

export const CUENTAS_DE_EJEMPLO: readonly CuentaDeEjemplo[] = [
  {
    id: 'usr-alcantara',
    nombre: 'Valentina Alcántara Rueda',
    correo: 'valentina.alcantara@labanfora.org',
    contrasena: 'Anfora-2026',
  },
  {
    id: 'usr-berrio',
    nombre: 'Joaquín Berrío Salazar',
    correo: 'joaquin.berrio@labanfora.org',
    contrasena: 'Ponencias-Mayo',
  },
  {
    id: 'usr-zuluaga',
    nombre: 'Camila Zuluaga Nieto',
    correo: 'camila.zuluaga@labanfora.org',
    contrasena: 'Simposio-Andes',
  },
  {
    id: 'usr-penaloza',
    nombre: 'Rodrigo Peñaloza Marín',
    correo: 'rodrigo.penaloza@labanfora.org',
    contrasena: 'Coloquio-Norte',
  },
]
