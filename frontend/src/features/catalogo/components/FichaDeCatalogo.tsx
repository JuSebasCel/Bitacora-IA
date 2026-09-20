import type { ReactElement } from 'react'
import { Link } from 'react-router'
import { formatearFecha, formatearTimestamp } from '@/features/conferencias/data'
import { TIPO_EN_SINGULAR, TONO_POR_VALIDACION, VALIDACION_EN_SINGULAR } from '@/features/conferencias/components/vocabulario'
import type { FichaDelCatalogo } from '@/features/conferencias/query'
import { textoDeFicha } from '@/features/conferencias/query'
import { Insignia } from '@/shared/ui'

export type PropsFichaDeCatalogo = {
  entrada: FichaDelCatalogo
  /*
    El nombre del tema llega ya resuelto y no se resuelve aquí.

    Criterio del proyecto para el id de tema (F9): `nombreDeTema` es el único
    resolutor, y quien lo llama depende de cuántos temas pinta el componente.
    Esta tarjeta pinta una sola ficha, así que recibe el nombre como prop y se
    queda sin conocer la taxonomía; el contenedor, que ya recorre la lista,
    resuelve de paso. Los componentes que pintan una lista de fichas
    (`ListadoDeFichas`) reciben en cambio el pool y llaman a `nombreDeTema`
    por fila, porque un nombre por prop obligaría a recorrer la lista dos
    veces solo para armarlo.
  */
  nombreDelTema: string
  /** Cadena de consulta del catálogo en ese momento, para poder volver a la misma vista filtrada. */
  busqueda?: string
}

/*
  El enlace lleva consigo los filtros del catálogo más un `origen=catalogo`.
  Sin esa marca, el detalle de la conferencia no tendría cómo distinguir si
  se llegó desde el dashboard o desde aquí, y su enlace de regreso mandaba
  siempre a `/conferencias`: quien venía del catálogo perdía sus filtros y
  terminaba en otra pantalla.

  Los dos listados usan nombres de parámetro distintos (`buscar` significa
  cosas distintas en cada uno), así que la marca explícita es lo que permite
  devolver cada quien a su sitio sin mezclar vocabularios de consulta.
*/
function enlaceDeRegresoAlCatalogo(busqueda: string): string {
  const parametros = new URLSearchParams(busqueda)
  parametros.set('origen', 'catalogo')

  return `?${parametros.toString()}`
}

/*
  Resultado del catálogo: mismo contenido de fila que `ListadoDeFichas.tsx`
  (coordenada, tipo, insignia de estado, tema, cita, contexto), más lo que
  esa pantalla no necesita mostrar porque ya vive dentro de una sola
  conferencia — de cuál conferencia, ponente y evento viene esta ficha. Se
  enlaza a esa conferencia, no a la ficha (no existe todavía ninguna ruta ni
  ancla por ficha individual en la app).

  **Silueta deliberadamente distinta a la de `FilaDeConferencia`.** Las dos
  pantallas se veían casi iguales (tarjeta clara, canaleta monoespaciada a la
  izquierda, apiladas en una columna) pese a mostrar cosas de naturaleza
  distinta: una conferencia es un registro que se escanea por sus metadatos,
  una ficha es una cita cuyo contenido ES el texto dicho.

  Por eso aquí el fragmento manda: tipografía mayor, sin canaleta lateral y
  sin barra de cita (ese borde izquierdo competía con la barra de acento del
  hover y repetía el gesto de "fila con canaleta"). Los metadatos se reparten
  en un encabezado compacto arriba y un pie separado por un filete, de modo
  que la tarjeta se lee como un recorte y no como un renglón de listado.

  Se conserva el hover de la casa (barra de acento, sombra, título a color de
  acento): lo que debía cambiar era la silueta, no el idioma de interacción.
*/
export function FichaDeCatalogo({
  entrada,
  nombreDelTema,
  busqueda = '',
}: PropsFichaDeCatalogo): ReactElement {
  const { ficha, conferencia } = entrada

  return (
    <article className="group relative flex flex-col gap-3 rounded-md bg-panel p-5 shadow-sm transition-shadow hover:shadow-md">
      <span
        aria-hidden="true"
        className="absolute top-4 bottom-4 left-0 w-0.5 scale-y-0 rounded-full bg-acento transition-transform duration-150 group-hover:scale-y-100"
      />

      {/*
        El tema va aquí arriba y no en el pie.

        Estuvo abajo, en monoespaciada y pegado al minuto (`Calidad de datos ·
        00:03:10`), y ahí era ilegible por dos razones: la monoespaciada es en
        esta aplicación el vestido de las coordenadas verificables (fecha,
        código de evento, minuto), así que disfrazaba de dato de trazabilidad
        lo que en realidad es la clasificación principal de la ficha; y quedaba
        justo debajo del título de la conferencia, que suele empezar por el
        mismo tema, con lo que se leía como un pedazo repetido del título.

        Es el eje de comparabilidad entre eventos de `PLAN.md` 3.1: lo que
        permite preguntar cómo se trató un tema a lo largo del tiempo. Tiene
        que verse antes que la cita, no después de ella.
      */}
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
        <span className="rounded-md bg-acento-tenue px-1.5 py-0.5 text-xs font-medium text-acento">
          Tema: {nombreDelTema}
        </span>
        <Insignia tono={TONO_POR_VALIDACION[ficha.estadoDeValidacion]}>
          {VALIDACION_EN_SINGULAR[ficha.estadoDeValidacion]}
        </Insignia>
        <span className="text-xs font-medium tracking-wide text-texto-tenue uppercase">
          {TIPO_EN_SINGULAR[ficha.tipoDeUnidad]}
        </span>
      </div>

      <blockquote className="text-lg leading-snug text-texto">{textoDeFicha(ficha)}</blockquote>

      <p className="text-xs leading-relaxed text-texto-tenue">{ficha.contextoMinimo}</p>

      <div className="mt-1 flex flex-col gap-1 border-t border-filete pt-3">
        <Link
          to={{ pathname: `/conferencias/${conferencia.id}`, search: enlaceDeRegresoAlCatalogo(busqueda) }}
          className="text-sm font-medium text-texto transition-colors after:absolute after:inset-0 group-hover:text-acento"
        >
          {conferencia.titulo}
        </Link>

        <p className="text-xs text-texto-tenue">
          {conferencia.ponente}
          {' · '}
          {conferencia.evento}
          {' · '}
          {formatearFecha(conferencia.fechaDelEvento)}
        </p>

        {/* En el pie queda solo la coordenada de verdad: en qué minuto de la charla se dijo. */}
        <p className="coordenada text-xs text-texto-tenue">{formatearTimestamp(ficha.segundoInicio)}</p>
      </div>
    </article>
  )
}
