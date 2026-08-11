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
  'usr-alcantara': {
    etiquetas: [
      { id: 'etq-alc-ia', nombre: 'IA', idPropietario: 'usr-alcantara' },
      { id: 'etq-alc-art1', nombre: 'art1', idPropietario: 'usr-alcantara' },
      { id: 'etq-alc-mixtos', nombre: 'métodos mixtos', idPropietario: 'usr-alcantara' },
    ],
    asignaciones: [
      { idEtiqueta: 'etq-alc-ia', idConferencia: 'cnf-alc-01' },
      { idEtiqueta: 'etq-alc-ia', idConferencia: 'cnf-alc-03' },
      { idEtiqueta: 'etq-alc-art1', idConferencia: 'cnf-alc-01' },
      { idEtiqueta: 'etq-alc-art1', idConferencia: 'cnf-alc-02' },
      { idEtiqueta: 'etq-alc-mixtos', idConferencia: 'cnf-alc-05' },
    ],
  },
  'usr-berrio': {
    etiquetas: [{ id: 'etq-ber-campo', nombre: 'trabajo de campo', idPropietario: 'usr-berrio' }],
    asignaciones: [{ idEtiqueta: 'etq-ber-campo', idConferencia: 'cnf-ber-04' }],
  },
  'usr-zuluaga': {
    etiquetas: [
      { id: 'etq-zul-ia', nombre: 'IA', idPropietario: 'usr-zuluaga' },
      { id: 'etq-zul-tesis', nombre: 'tesis', idPropietario: 'usr-zuluaga' },
      { id: 'etq-zul-revision', nombre: 'revisión 2026', idPropietario: 'usr-zuluaga' },
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
  'usr-penaloza': {
    etiquetas: [],
    asignaciones: [],
  },
}
