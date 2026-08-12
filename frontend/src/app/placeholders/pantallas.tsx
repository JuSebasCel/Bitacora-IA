import { PantallaDeModulo } from './PantallaDeModulo'

/*
  Una pantalla por sección de la navegación. Cada texto describe, en presente y
  en términos del producto, el trabajo que se hace en esa sección.
*/

/*
  Conferencias, Cargar conferencia y Plantillas ya no están aquí: F2, F3 y F4
  las sustituyeron por sus pantallas reales, que viven en
  `features/conferencias/screens` y `features/plantillas/screens`.
*/

export function PantallaCatalogo() {
  return (
    <PantallaDeModulo
      titulo="Catálogo"
      descripcion="Filtra las fichas por tema, tipo de unidad, evento y estado de validación, y abre cada una en su coordenada dentro de la conferencia de origen."
    />
  )
}

export function PantallaMemorias() {
  return (
    <PantallaDeModulo
      titulo="Memorias"
      descripcion="Compone la memoria de una conferencia a partir de una plantilla guardada y muestra la vista previa del documento antes de exportarlo."
    />
  )
}

export function PantallaConfiguracion() {
  return (
    <PantallaDeModulo
      titulo="Configuración"
      descripcion="Guarda tu API key, revisa las conferencias compartidas contigo y envía invitaciones a otras personas registradas."
    />
  )
}
