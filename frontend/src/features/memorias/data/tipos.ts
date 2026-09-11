/*
  Tipos del dominio de memorias (F5). Solo declaraciones: la lógica vive en
  `../mapeo.ts` y `../generarMemoria.ts`, los datos de ejemplo en
  `memorias.fixture.ts`.

  Una `Memoria` guardada es un registro liviano, no el documento congelado:
  referencia a qué conferencia y qué plantilla se generó, y el documento se
  vuelve a generar al vuelo cada vez que se abre (ver `generarMemoria.ts`) —
  consistente con `PLAN.md` sección 1.3 ("el entregable A es una
  vista/exportación derivada, no un proceso paralelo").

  `idDueno` es quien la generó (B11): una memoria es privada a esa cuenta, a
  diferencia de una plantilla, que es del grupo. Compartir el contenido de
  origen sigue siendo cosa de `comparticiones` sobre la conferencia, no de
  este campo.
*/
export type Memoria = {
  readonly id: string
  readonly idConferencia: string
  readonly idPlantilla: string
  readonly idDueno: string
  readonly nombre: string
  readonly generadaEl: string
}
