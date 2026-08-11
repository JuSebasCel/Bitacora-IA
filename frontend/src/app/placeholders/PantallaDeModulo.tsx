import { EncabezadoDeSeccion } from '@/shared/ui'

type PropiedadesPantallaDeModulo = {
  titulo: string
  descripcion: string
}

/*
  Marcador de posición de un módulo todavía sin construir: solo el encabezado
  común de la sección. El encabezado en sí vive en `shared/ui`, porque las
  pantallas ya construidas usan exactamente el mismo.
*/
export function PantallaDeModulo({ titulo, descripcion }: PropiedadesPantallaDeModulo) {
  return <EncabezadoDeSeccion titulo={titulo} descripcion={descripcion} />
}
