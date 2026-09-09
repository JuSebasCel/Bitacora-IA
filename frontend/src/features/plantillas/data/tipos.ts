import type { JSONContent } from '@tiptap/core'

/*
  Tipos del dominio de plantillas (F4). Solo declaraciones: la lógica que
  opera sobre ellos vive en `plantillas.ts`, la lectura/generación de
  `.docx` en `editor/`, y los datos de ejemplo en
  `plantillas.fixture.ts`/`campos.ts`.

  Segunda revisión de alcance (ver
  `.agent/plans/f4-editor-de-plantillas-word-plan-design.md` y la sesión que
  le siguió): una plantilla ya no es un único modelo. Si se construye desde
  cero, sigue siendo un documento TipTap editable en flujo (`origen:
  'blanco'`). Si se importa un `.docx` real, ese archivo se conserva
  **intacto** — la app nunca lo reconstruye ni lo re-renderiza como
  contenido editable, solo lee sus placeholders y pide a qué dato del
  repositorio se liga cada uno (`origen: 'docx'`). El pedido explícito del
  usuario fue que el diseño hecho en Word quede exactamente igual y el LLM
  solo escriba donde él marcó, desde Word, no desde la página.
*/

/** Los cinco campos del repositorio que `PLAN.md` sección 5.6 nombra como ejemplo de placeholder. */
export type CampoDeMarcador =
  | 'tema_principal'
  | 'cita_destacada'
  | 'nombre_ponente'
  | 'fecha_evento'
  | 'resumen_metodo'

/** Cómo se espera que se vea el contenido generado para un marcador simple. */
export type FormatoDeMarcador = 'parrafo' | 'lista_vinetas' | 'lista_numerada'

/**
 * Un marcador liga a uno de los cinco campos fijos del repositorio, o a una
 * etiqueta de texto libre cuando la plantilla necesita algo que ningún campo
 * fijo cubre (ej. "Puntos de la agenda del evento"). Nunca ambos a la vez.
 */
export type OrigenDeMarcador =
  | { readonly tipo: 'campo'; readonly campo: CampoDeMarcador }
  | { readonly tipo: 'personalizado'; readonly etiqueta: string }

/** Cómo se comporta una sección envuelta dentro del editor en blanco (nodo `seccionMarcador` de TipTap). */
export type ModoDeSeccion = 'condicional' | 'repetible'

// ---------------------------------------------------------------------------
// Plantilla en blanco: documento TipTap editable en flujo (sin cambios).
// ---------------------------------------------------------------------------

export type PlantillaEnBlanco = {
  readonly id: string
  readonly nombre: string
  readonly origen: 'blanco'
  /** Hex, editado con `<input type="color">`. */
  readonly colorPrincipal: string
  readonly colorSecundario: string
  readonly contenido: JSONContent
  readonly actualizadaEl: string
}

// ---------------------------------------------------------------------------
// Plantilla importada de .docx: el archivo original nunca se modifica.
// ---------------------------------------------------------------------------

/**
 * Un marcador simple sustituye un único `[[texto]]` por el dato mapeado —
 * `editor/prepararComandos.ts` lo traduce a un `INS` de `docx-templates`.
 */
export type MarcadorSimpleDeDocx = {
  readonly tipo: 'simple'
  readonly id: string
  /** El texto exacto tal como aparece en el archivo, ej. `"[[Nombre grupo]]"`. */
  readonly textoOriginal: string
  /** Texto completo del párrafo que contiene el marcador — para mostrarlo con contexto, no como un corchete suelto. */
  readonly contexto: string
  readonly origenDeDato: OrigenDeMarcador
  readonly formato: FormatoDeMarcador
}

/**
 * Envuelve un tramo del documento escrito en Word entre `[[SI: descripción]]`
 * / `[[FIN SI]]` (condicional) o `[[REPETIR: descripción]]` / `[[FIN
 * REPETIR]]` (repetible) — se traduce a `IF`/`FOR` de `docx-templates`.
 */
export type MarcadorDeSeccionDeDocx = {
  readonly tipo: 'condicional' | 'repetible'
  readonly id: string
  readonly descripcion: string
  readonly origenDeDato: OrigenDeMarcador
}

export type MarcadorDeDocx = MarcadorSimpleDeDocx | MarcadorDeSeccionDeDocx

export type PlantillaDesdeDocx = {
  readonly id: string
  readonly nombre: string
  readonly origen: 'docx'
  /**
   * Ruta del `.docx` dentro del bucket `plantillas-docx`, nunca sus bytes.
   *
   * Hasta B6 este campo era el archivo entero como data URL en base64. Un
   * `.docx` de los 10 MB que admite `validarDocx` ocupaba ahí cerca de 14 MB
   * de texto, dentro de un `sessionStorage` con una cuota típica de 5 MB:
   * bastaba una plantilla real para que el guardado empezara a fallar en
   * silencio. Ahora el archivo se sube al bucket y el registro guarda solo su
   * ruta (`plantillas.ruta_archivo_original`); los bytes se descargan cuando
   * de verdad hacen falta (miniatura, confirmación, generación de memoria).
   */
  readonly rutaArchivoOriginal: string
  readonly marcadores: readonly MarcadorDeDocx[]
  readonly actualizadaEl: string
}

export type Plantilla = PlantillaEnBlanco | PlantillaDesdeDocx

/**
 * Dato real de una conferencia para uno o más de los cinco campos fijos,
 * usado por F5 al generar una memoria — ver `campos.ts`. Un campo ausente del
 * registro cae al dato de ejemplo de ese campo, nunca lanza.
 */
export type RegistroDeDatosDeCampo = Partial<Record<CampoDeMarcador, { readonly parrafo: string; readonly lista: readonly string[] }>>

export type { JSONContent }
