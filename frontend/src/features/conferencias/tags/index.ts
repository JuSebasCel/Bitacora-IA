/*
  Superficie pública de las etiquetas personales: operaciones puras,
  persistencia y el hook que las une para la pantalla.
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

export { CLAVE_ETIQUETAS, espacioDe, guardarEspacio, leerEspaciosGuardados } from './almacenamiento'

export type { ValorDeEtiquetas } from './useEtiquetas'
export { useEtiquetas } from './useEtiquetas'
