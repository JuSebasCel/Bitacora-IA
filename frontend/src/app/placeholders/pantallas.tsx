import { PantallaDeModulo } from './PantallaDeModulo'

/*
  Una pantalla por sección de la navegación. Cada texto describe, en presente y
  en términos del producto, el trabajo que se hace en esa sección.
*/

/*
  Conferencias, Cargar conferencia, Catálogo, Plantillas y Memorias ya no
  están aquí: F2, F3, F4, F5 y F6 las sustituyeron por sus pantallas reales,
  que viven en `features/conferencias/screens`, `features/catalogo/screens`,
  `features/plantillas/screens` y `features/memorias/screens`.
*/

export function PantallaConfiguracion() {
  return (
    <PantallaDeModulo
      titulo="Configuración"
      descripcion="Guarda tu API key, revisa las conferencias compartidas contigo y envía invitaciones a otras personas registradas."
    />
  )
}
