/*
  Personas de ejemplo del grupo de investigación, para las pantallas que
  siguen sobre datos simulados (F2-F9): a quién se puede invitar a compartir
  una conferencia, y de quién es cada conferencia/comparticion de ejemplo.

  Antes vivía junto a las cuentas de acceso simulado (`auth/session`), pero
  B1 conectó el acceso a Supabase Auth real -- ya no hay una lista fija de
  cuentas con las que entrar. Estas cuatro personas se separaron a este
  fixture propio porque siguen haciendo falta como *datos de ejemplo* del
  directorio (mismos ids que ya usan `conferencias.fixture.ts` y
  `etiquetas.fixture.ts`), sin que eso implique que se pueda entrar con
  ellas: cuando F2-F9 se reconecten a datos reales (más adelante en la fase
  2), este fixture se retira igual que se retiró el de cuentas.
*/

export type PersonaDeEjemplo = {
  readonly id: string
  readonly nombre: string
  readonly correo: string
}

export const PERSONAS_DE_EJEMPLO: readonly PersonaDeEjemplo[] = [
  { id: '1ba5af9a-f6a2-4504-ab60-1f018c21290a', nombre: 'Valentina Alcántara Rueda', correo: 'valentina.alcantara@labanfora.org' },
  { id: 'fd5f0a48-ca53-425c-819a-a1b005f529bd', nombre: 'Joaquín Berrío Salazar', correo: 'joaquin.berrio@labanfora.org' },
  { id: 'ad474b7c-4a6e-4092-8c7e-ccf8701d9178', nombre: 'Camila Zuluaga Nieto', correo: 'camila.zuluaga@labanfora.org' },
  { id: '1f265edb-88ff-48fb-aeaf-1ff0c8d49aa5', nombre: 'Rodrigo Peñaloza Marín', correo: 'rodrigo.penaloza@labanfora.org' },
]
