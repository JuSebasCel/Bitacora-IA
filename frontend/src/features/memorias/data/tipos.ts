/*
  Tipos del dominio de memorias (F5). Solo declaraciones: la lógica vive en
  `../mapeo.ts` y `../generarMemoria.ts`, los datos de ejemplo en
  `memorias.fixture.ts`.

  Una `Memoria` guardada es un registro liviano, no el documento congelado:
  referencia a qué conferencia y qué plantilla se generó, y el documento se
  vuelve a generar al vuelo cada vez que se abre (ver `generarMemoria.ts`) —
  consistente con `PLAN.md` sección 1.3 ("el entregable A es una
  vista/exportación derivada, no un proceso paralelo").
*/
export type Memoria = {
  readonly id: string
  readonly idConferencia: string
  readonly idPlantilla: string
  readonly nombre: string
  readonly generadaEl: string
}
