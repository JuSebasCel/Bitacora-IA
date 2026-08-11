import type { Variants } from 'motion/react'

/*
  Variantes compartidas entre `ListadoDeConferencias` (el contenedor) y
  `FilaDeConferencia` (cada elemento). Viven en su propio módulo y no en
  cualquiera de los dos componentes, para que importarlas no cree un ciclo
  entre archivos que además se importan entre sí por su JSX.

  El stagger anuncia que el listado terminó de cargar, no que "se ve bonito":
  React solo dispara `initial` cuando un nodo se monta por primera vez, así
  que esto entra una vez al pasar de cargando a listo, y una fila que aparece
  porque un filtro deja de excluirla entra sola, sin repetir la coreografía
  completa en cada tecla de la búsqueda.
*/
export const CONTENEDOR_DE_LISTADO: Variants = {
  oculto: {},
  visible: { transition: { staggerChildren: 0.035 } },
}

export const ELEMENTO_DE_FILA: Variants = {
  oculto: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
}
