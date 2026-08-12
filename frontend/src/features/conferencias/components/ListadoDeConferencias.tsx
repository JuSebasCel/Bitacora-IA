import { motion, useReducedMotion } from 'motion/react'
import { Button, EstadoVacio, Esqueleto } from '@/shared/ui'
import type { Etiqueta } from '../data'
import type { ConferenciaVisible, Segmento } from '../query'
import type { EtiquetaVisible } from '../tags'
import { CONTENEDOR_DE_LISTADO } from './animaciones'
import type { ResultadoCreacion } from './CreadorDeEtiqueta'
import { FilaDeConferencia } from './FilaDeConferencia'

/*
  El listado con sus cuatro estados.

  El estado llega como prop en vez de deducirse aquí dentro, para que los
  cuatro se puedan probar directamente sobre el componente sin simular fallos
  ni inyectar dependencias.

  Los dos vacíos no son el mismo y no dicen lo mismo: uno se resuelve cargando
  una conferencia, el otro quitando un filtro. Un texto común mandaría a la
  persona al lugar equivocado.
*/

export type DatosDeFila = {
  readonly visible: ConferenciaVisible
  readonly etiquetas: readonly EtiquetaVisible[]
  readonly numeroDeFichas: number
}

export type EstadoDelListado = 'cargando' | 'listo' | 'vacio-sin-datos' | 'vacio-por-filtros'

type PropiedadesListado = {
  estado: EstadoDelListado
  filas: readonly DatosDeFila[]
  segmento: Segmento
  busqueda: string
  alQuitarFiltros: () => void
  misEtiquetas: readonly Etiqueta[]
  alAlternarAsignacion: (idEtiqueta: string, idConferencia: string) => void
  alCrearYAsignar: (nombre: string, idConferencia: string) => ResultadoCreacion
  alOcultar: (idConferencia: string) => void
}

const VACIO_POR_SEGMENTO: Record<Segmento, { titulo: string; descripcion: string }> = {
  todas: {
    titulo: 'Todavía no hay conferencias',
    descripcion:
      'Cuando cargues una charla o alguien comparta la suya contigo, aparecerá aquí con su tema, su estado y sus fichas.',
  },
  propias: {
    titulo: 'Todavía no has cargado ninguna conferencia',
    descripcion:
      'Carga el audio o la transcripción de una charla para que el sistema la procese y la deje aquí con sus fichas.',
  },
  compartidas: {
    titulo: 'Nadie ha compartido conferencias contigo',
    descripcion:
      'Cuando alguien del grupo te dé acceso a sus charlas, las verás aquí junto a las tuyas.',
  },
}

function textoDeConteo(total: number): string {
  return total === 1 ? '1 conferencia a la vista' : `${total} conferencias a la vista`
}

export function ListadoDeConferencias({
  estado,
  filas,
  segmento,
  busqueda,
  alQuitarFiltros,
  misEtiquetas,
  alAlternarAsignacion,
  alCrearYAsignar,
  alOcultar,
}: PropiedadesListado) {
  const reducirMovimiento = useReducedMotion()

  if (estado === 'cargando') {
    return <Esqueleto filas={4} etiqueta="Cargando las conferencias" />
  }

  if (estado === 'vacio-sin-datos') {
    const texto = VACIO_POR_SEGMENTO[segmento]

    return <EstadoVacio titulo={texto.titulo} descripcion={texto.descripcion} />
  }

  if (estado === 'vacio-por-filtros') {
    return (
      <EstadoVacio
        titulo="Ningún resultado con estos filtros"
        descripcion="Ninguna de las conferencias que puedes ver cumple todo lo que pediste a la vez. Prueba a soltar alguno de los filtros."
      >
        <Button variante="secundario" onClick={alQuitarFiltros}>
          Quitar filtros
        </Button>
      </EstadoVacio>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="coordenada text-xs text-texto-tenue">{textoDeConteo(filas.length)}</p>

      <motion.ul
        aria-label="Conferencias"
        variants={CONTENEDOR_DE_LISTADO}
        initial={reducirMovimiento ? false : 'oculto'}
        animate="visible"
        className="flex flex-col gap-2"
      >
        {filas.map((fila) => (
          <FilaDeConferencia
            key={fila.visible.conferencia.id}
            visible={fila.visible}
            etiquetas={fila.etiquetas}
            numeroDeFichas={fila.numeroDeFichas}
            busqueda={busqueda}
            misEtiquetas={misEtiquetas}
            alAlternarAsignacion={(idEtiqueta) =>
              alAlternarAsignacion(idEtiqueta, fila.visible.conferencia.id)
            }
            alCrearYAsignar={(nombre) => alCrearYAsignar(nombre, fila.visible.conferencia.id)}
            alOcultar={() => alOcultar(fila.visible.conferencia.id)}
          />
        ))}
      </motion.ul>
    </div>
  )
}
