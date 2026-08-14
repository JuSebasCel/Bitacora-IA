import { LARGO_MINIMO_DE_CONTRASENA } from '@/shared/errors'

/*
  Espejo en el cliente de `password_requirements = "lower_upper_letters_digits_symbols"`
  (`supabase/config.toml`, B1): mismas cinco condiciones, evaluadas en el
  navegador para dar realimentación instantánea mientras se escribe, sin
  esperar el viaje de red a Supabase Auth.
*/

export type ReglaDeContrasena = {
  clave: 'longitud' | 'mayuscula' | 'minuscula' | 'numero' | 'simbolo'
  texto: string
  cumplida: boolean
}

export function reglasDeContrasena(contrasena: string): ReglaDeContrasena[] {
  return [
    {
      clave: 'longitud',
      texto: `Al menos ${LARGO_MINIMO_DE_CONTRASENA} caracteres`,
      cumplida: contrasena.length >= LARGO_MINIMO_DE_CONTRASENA,
    },
    { clave: 'mayuscula', texto: 'Una mayúscula', cumplida: /[A-Z]/.test(contrasena) },
    { clave: 'minuscula', texto: 'Una minúscula', cumplida: /[a-z]/.test(contrasena) },
    { clave: 'numero', texto: 'Un número', cumplida: /[0-9]/.test(contrasena) },
    { clave: 'simbolo', texto: 'Un símbolo', cumplida: /[^A-Za-z0-9]/.test(contrasena) },
  ]
}

export function contrasenaCumpleTodo(contrasena: string): boolean {
  return reglasDeContrasena(contrasena).every((regla) => regla.cumplida)
}
