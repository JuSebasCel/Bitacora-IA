/*
  Superficie pública de las etiquetas personales: operaciones puras, el
  repositorio contra Supabase y el hook que las une para la pantalla.
*/

export type {
  EntradaDeEtiquetasVisibles,
  EtiquetaVisible,
  ResultadoEspacio,
  ResultadoEtiqueta,
} from './etiquetas'
export {
  asignarEtiqueta,
  crearEtiqueta,
  etiquetasDeConferencia,
  etiquetasVisibles,
  quitarEtiqueta,
} from './etiquetas'

export {
  asignarEtiquetaRemota,
  crearEtiquetaRemota,
  leerEtiquetasVisiblesPorConferencia,
  leerMiEspacio,
  quitarAsignacionRemota,
} from './repositorio'

export type { ValorDeEtiquetas } from './useEtiquetas'
export { useEtiquetas } from './useEtiquetas'
