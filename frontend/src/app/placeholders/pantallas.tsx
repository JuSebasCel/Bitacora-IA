import { PantallaDeModulo } from './PantallaDeModulo'

/*
  Una pantalla por sección de la navegación. Cada texto describe, en presente y
  en términos del producto, el trabajo que se hace en esa sección.
*/

export function PantallaConferencias() {
  return (
    <PantallaDeModulo
      titulo="Conferencias"
      descripcion="Reúne las conferencias propias y las compartidas contigo, con su tema principal, su estado de procesamiento y el número de fichas obtenidas."
    />
  )
}

export function PantallaCargarConferencia() {
  return (
    <PantallaDeModulo
      titulo="Cargar conferencia"
      descripcion="Recibe el audio o la transcripción de una sesión, la registra con su evento y fecha, y sigue su procesamiento hasta que las fichas quedan disponibles."
    />
  )
}

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

export function PantallaPlantillas() {
  return (
    <PantallaDeModulo
      titulo="Plantillas"
      descripcion="Define el logo, los colores, la estructura y los marcadores de cada plantilla, y los reutiliza en la generación de memorias."
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
