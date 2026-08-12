import type { Rectangulo } from '../geometria/geometria'

export type { Rectangulo }

/*
  Tipos del dominio de plantillas (F4). Solo declaraciones: la lógica que
  opera sobre ellos vive en `plantillas.ts`, y los datos de ejemplo en
  `plantillas.fixture.ts`/`campos.ts`.
*/

/** Controla tamaño y peso de fuente de un elemento de texto. */
export type RolDeTexto = 'titulo' | 'subtitulo' | 'cuerpo'

/** Cómo se espera que se vea el contenido generado para un marcador: texto corrido o viñetas. */
export type FormatoDeMarcador = 'parrafo' | 'lista'

/** Los cinco campos del repositorio que PLAN.md sección 5.6 nombra como ejemplo de placeholder. */
export type CampoDeMarcador =
  | 'tema_principal'
  | 'cita_destacada'
  | 'nombre_ponente'
  | 'fecha_evento'
  | 'resumen_metodo'

type ElementoBase = {
  readonly id: string
  readonly posicion: Rectangulo
}

export type ElementoDeTexto = ElementoBase & {
  readonly tipo: 'texto'
  readonly rol: RolDeTexto
  readonly contenido: string
  readonly color?: string
}

export type ElementoDeImagen = ElementoBase & {
  readonly tipo: 'imagen'
  /** Data URL en base64: a diferencia de `URL.createObjectURL`, sobrevive a un recargado de página. */
  readonly url: string
  readonly nombreDeArchivo: string
}

export type ElementoDeMarcador = ElementoBase & {
  readonly tipo: 'marcador'
  readonly campo: CampoDeMarcador
  readonly formato: FormatoDeMarcador
}

export type ElementoDePlantilla = ElementoDeTexto | ElementoDeImagen | ElementoDeMarcador

export type Plantilla = {
  readonly id: string
  readonly nombre: string
  /** Hex, editado con `<input type="color">`. */
  readonly colorPrincipal: string
  readonly colorSecundario: string
  readonly elementos: readonly ElementoDePlantilla[]
  readonly actualizadaEl: string
}
