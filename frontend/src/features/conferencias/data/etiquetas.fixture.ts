import type { EspacioDeEtiquetas } from './tipos'

/*
  Etiquetas personales de ejemplo, un espacio por cuenta.

  Son privadas: el espacio de una persona no se cruza nunca con el de otra
  (PRD.md sección 3.1). Por eso la estructura es un mapa por usuario y no una
  lista global con un campo de propietario que alguien pueda olvidar filtrar.

  Tres cosas que este fixture demuestra a propósito:

  - Valentina y Camila tienen, las dos, una etiqueta llamada "IA". No es la
    misma etiqueta: mismo nombre, propietarias distintas, identificadores
    distintos.
  - Camila etiqueta conferencias que no son suyas, que es el caso de uso que
    originó la funcionalidad: marcar material ajeno para un artículo propio.
  - Rodrigo no tiene ninguna, para que el estado vacío del filtro y la creación
    al vuelo se puedan probar con datos reales del fixture.

  Cuando entre B6 este archivo SE BORRA: las etiquetas pasan a una tabla con
  reglas de acceso por fila, donde el aislamiento deja de depender de esta forma.
*/

export const ESPACIOS_DE_ETIQUETAS_DE_EJEMPLO: Readonly<Record<string, EspacioDeEtiquetas>> = {
  '1ba5af9a-f6a2-4504-ab60-1f018c21290a': {
    etiquetas: [
      { id: 'etq-alc-ia', nombre: 'IA', idPropietario: '1ba5af9a-f6a2-4504-ab60-1f018c21290a' },
      { id: 'etq-alc-art1', nombre: 'art1', idPropietario: '1ba5af9a-f6a2-4504-ab60-1f018c21290a' },
      { id: 'etq-alc-mixtos', nombre: 'métodos mixtos', idPropietario: '1ba5af9a-f6a2-4504-ab60-1f018c21290a' },
    ],
    asignaciones: [
      { idEtiqueta: 'etq-alc-ia', idConferencia: 'cnf-alc-01' },
      { idEtiqueta: 'etq-alc-ia', idConferencia: 'cnf-alc-03' },
      { idEtiqueta: 'etq-alc-art1', idConferencia: 'cnf-alc-01' },
      { idEtiqueta: 'etq-alc-art1', idConferencia: 'cnf-alc-02' },
      { idEtiqueta: 'etq-alc-mixtos', idConferencia: 'cnf-alc-05' },
    ],
  },
  'fd5f0a48-ca53-425c-819a-a1b005f529bd': {
    etiquetas: [{ id: 'etq-ber-campo', nombre: 'trabajo de campo', idPropietario: 'fd5f0a48-ca53-425c-819a-a1b005f529bd' }],
    asignaciones: [{ idEtiqueta: 'etq-ber-campo', idConferencia: 'cnf-ber-04' }],
  },
  'ad474b7c-4a6e-4092-8c7e-ccf8701d9178': {
    etiquetas: [
      { id: 'etq-zul-ia', nombre: 'IA', idPropietario: 'ad474b7c-4a6e-4092-8c7e-ccf8701d9178' },
      { id: 'etq-zul-tesis', nombre: 'tesis', idPropietario: 'ad474b7c-4a6e-4092-8c7e-ccf8701d9178' },
      { id: 'etq-zul-revision', nombre: 'revisión 2026', idPropietario: 'ad474b7c-4a6e-4092-8c7e-ccf8701d9178' },
    ],
    asignaciones: [
      /* Sobre conferencias que le compartieron, no suyas. */
      { idEtiqueta: 'etq-zul-ia', idConferencia: 'cnf-alc-01' },
      { idEtiqueta: 'etq-zul-tesis', idConferencia: 'cnf-alc-03' },
      /* Sobre las suyas. */
      { idEtiqueta: 'etq-zul-tesis', idConferencia: 'cnf-zul-01' },
      { idEtiqueta: 'etq-zul-revision', idConferencia: 'cnf-zul-03' },
    ],
  },
  '1f265edb-88ff-48fb-aeaf-1ff0c8d49aa5': {
    etiquetas: [],
    asignaciones: [],
  },
}
