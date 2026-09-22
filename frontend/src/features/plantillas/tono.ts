/*
  El tono con que la IA redacta las memorias de una plantilla.

  Unos cuantos predefinidos cubren los usos de siempre, y "Personalizado"
  deja escribir la instrucción tal cual, para el caso que ninguno cubre.
  Cada predefinido es una frase que va a la indicación del modelo: aquí vive
  el texto exacto, y no en el backend, para que quien lo lea en la interfaz
  vea lo mismo que recibe la IA.
*/

export type PresetDeTono = 'institucional' | 'academico' | 'divulgativo' | 'ejecutivo' | 'periodistico' | 'personalizado'

export type TonoDePlantilla = {
  readonly preset: PresetDeTono
  /** Solo con `personalizado`: la instrucción escrita por la persona. */
  readonly propio: string
}

export const TONO_POR_DEFECTO: TonoDePlantilla = { preset: 'institucional', propio: '' }

export const PRESETS_DE_TONO: readonly {
  readonly valor: PresetDeTono
  readonly etiqueta: string
  readonly icono: string
  readonly instruccion: string
}[] = [
  {
    valor: 'institucional',
    etiqueta: 'Institucional',
    icono: 'account_balance',
    instruccion: 'Tono formal e institucional, en tercera persona, sobrio y sin adjetivos de valoración.',
  },
  {
    valor: 'academico',
    etiqueta: 'Académico',
    icono: 'school',
    instruccion:
      'Tono académico: preciso, en tercera persona, con vocabulario técnico del campo y distinguiendo lo que el ponente afirma de lo que muestra con datos.',
  },
  {
    valor: 'divulgativo',
    etiqueta: 'Divulgativo',
    icono: 'lightbulb',
    instruccion:
      'Tono divulgativo: claro y cercano, para un público no especialista; explica los términos técnicos en pocas palabras y prefiere frases cortas.',
  },
  {
    valor: 'ejecutivo',
    etiqueta: 'Ejecutivo',
    icono: 'trending_up',
    instruccion:
      'Tono ejecutivo: directo y breve, para quien decide; empieza por la conclusión y resalta implicaciones y cifras.',
  },
  {
    valor: 'periodistico',
    etiqueta: 'Periodístico',
    icono: 'newspaper',
    instruccion:
      'Tono periodístico: narrativo y atractivo, en tercera persona, con lo más importante primero y atribuyendo cada idea al ponente.',
  },
  {
    valor: 'personalizado',
    etiqueta: 'Personalizado',
    icono: 'edit',
    instruccion: '',
  },
]

/** La frase que recibe el modelo. Un personalizado vacío vuelve al tono de siempre. */
export function instruccionDeTono(tono: TonoDePlantilla | undefined): string {
  const elegido = tono ?? TONO_POR_DEFECTO

  if (elegido.preset === 'personalizado') {
    return elegido.propio.trim() || instruccionDeTono(TONO_POR_DEFECTO)
  }

  return PRESETS_DE_TONO.find((preset) => preset.valor === elegido.preset)?.instruccion ?? ''
}
