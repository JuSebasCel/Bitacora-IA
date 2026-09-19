import { useMemo, useRef, useState } from 'react'
import type { ReactElement, ReactNode } from 'react'
import { nombreDeTema } from '@/features/taxonomia'
import type { Tema } from '@/features/taxonomia'
import {
  BotonPildora,
  EstadoVacioIlustrado,
  Esqueleto,
  Insignia,
  Modal,
  PanelDeError,
  SelectorDeVista,
} from '@/shared/ui'
import type { OpcionDeVista } from '@/shared/ui'
import { TIPO_EN_SINGULAR, TONO_POR_VALIDACION, VALIDACION_EN_SINGULAR } from '../components/vocabulario'
import { formatearTimestamp } from '../data'
import type { EstadoDeValidacion, Ficha } from '../data'
import { fichasDelCatalogo, privacidadEfectiva } from '../query'
import type { ConferenciaVisible, FichaDelCatalogo } from '../query'

/*
  Archivo: todo el material en una sola pantalla, con el modelo de columnas de
  la app de referencia.

  **Navegación por niveles, con ventana deslizante de tres columnas:**

      Eventos  →  Conferencias o Temas  →  Fichas  →  Detalle

  El segundo nivel tiene dos caras porque hay dos formas legítimas de buscar
  lo mismo: por la charla en que se dijo, o por el tema del que trata. Antes
  solo estaba la de temas, y una conferencia no se podía abrir — que es
  justamente lo que dejaba a "Ir a la conferencia" sin ningún sitio adonde ir.

  Las columnas **colapsan animando `max-width`** (0.7s, medido de la
  referencia) en vez de desaparecer: por eso se ve como una puerta corredera y
  no como un salto. Ver `.columna-colapsable` en `styles/index.css`.

  **La vista completa no es solo para el detalle.** Sirve en cualquier nivel:
  esconde las columnas de navegación y deja la del nivel actual a todo lo
  ancho, con su propio retroceso. Que solo valiera para la ficha era un modo
  a medias.

  Medidas de la referencia: columnas con 8px de separación, radio 24 y padding
  24; las de navegación rellenas y la de detalle sobre el fondo con filete;
  filas de radio 16 con padding 8/24, y la elegida en el par de ilustración.
*/

const TODOS_EVENTOS = 'todos-eventos'
const TODOS = 'todos'

type Vista = 'columnas' | 'completa'
/* Por dónde se entra al segundo nivel. Las dos desembocan en las mismas fichas. */
type Eje = 'conferencias' | 'temas'
/* Sobre qué busca el buscador. Sin texto escrito da igual, y no se muestra. */
type Ambito = 'seleccion' | 'todo'

const ICONO_POR_VALIDACION: Record<EstadoDeValidacion, string> = {
  validada: 'check_circle',
  pendiente: 'pending',
  automatica: 'auto_awesome',
}

const VISTAS: readonly [OpcionDeVista<Vista>, OpcionDeVista<Vista>] = [
  { valor: 'columnas', icono: 'view_column', etiqueta: 'Ver en columnas' },
  { valor: 'completa', icono: 'grid_view', etiqueta: 'Ver a pantalla completa' },
]

const EJES: readonly { valor: Eje; etiqueta: string }[] = [
  { valor: 'conferencias', etiqueta: 'Conferencias' },
  { valor: 'temas', etiqueta: 'Temas' },
]

const AMBITOS: readonly { valor: Ambito; etiqueta: string }[] = [
  { valor: 'seleccion', etiqueta: 'En esta selección' },
  { valor: 'todo', etiqueta: 'En todo el archivo' },
]

/*
  Grupo de pastillas mutuamente excluyentes; lo usan el eje y el ámbito.

  **Se dimensiona por su contenido (`w-fit`), nunca al ancho del padre:** a
  todo lo ancho de la vista completa el control se estiraba hasta perder la
  forma de pastilla y dejaba de leerse como un interruptor.

  El relleno del elegido es **una sola pieza que se desliza**, no un fondo que
  salta de un botón a otro. Las columnas son `1fr` iguales (`auto-cols-fr`),
  así que su sitio es `translateX(índice × 100%)` sin medir nada.
*/
function Segmentado<T extends string>({
  opciones,
  valor,
  alCambiar,
}: {
  opciones: readonly { valor: T; etiqueta: string }[]
  valor: T
  alCambiar: (siguiente: T) => void
}): ReactElement {
  const indice = Math.max(
    0,
    opciones.findIndex((opcion) => opcion.valor === valor),
  )

  return (
    <div className="relative grid w-fit auto-cols-fr grid-flow-col rounded-full bg-acento-tenue p-1">
      <span
        aria-hidden="true"
        /* `p-1` a cada lado: el carril mide el ancho del grupo menos esos 8px. */
        style={{
          width: `calc((100% - 0.5rem) / ${opciones.length})`,
          transform: `translateX(${indice * 100}%)`,
        }}
        className="absolute top-1 bottom-1 left-1 rounded-full bg-acento transition-transform duration-300 ease-(--ease-rebote-suave)"
      />

      {opciones.map((opcion) => (
        <button
          key={opcion.valor}
          type="button"
          onClick={() => alCambiar(opcion.valor)}
          aria-pressed={valor === opcion.valor}
          className={`relative z-10 cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
            valor === opcion.valor ? 'text-acento-contraste' : 'text-texto-tenue hover:text-texto'
          }`}
        >
          {opcion.etiqueta}
        </button>
      ))}
    </div>
  )
}

function Columna({
  children,
  pie,
  ancho,
  colapsada = false,
  expandida = false,
  variante = 'rellena',
}: {
  children: ReactNode
  pie?: ReactNode
  /** Ancho natural en píxeles; es también el tope del que colapsa. */
  ancho: number
  colapsada?: boolean
  /** En vista completa, la columna del nivel actual ocupa el sitio de las demás. */
  expandida?: boolean
  variante?: 'rellena' | 'contorno'
}): ReactElement {
  return (
    <section
      /*
        El ancho va en línea y no como clase de Tailwind porque es el mismo
        número que sirve de `max-width`: tenerlo en dos sitios los deja
        divergir en cuanto alguien cambie uno.

        Expandida cede el ancho al flex (`flex-1`) en vez de pedir un número
        enorme: con un ancho fijo de 9999 la columna se salía de la pantalla y
        las filas quedaban cortadas por el borde derecho.
      */
      style={{
        maxWidth: colapsada ? 0 : expandida ? '100%' : ancho,
        width: expandida ? 'auto' : ancho,
      }}
      /*
        `inert` y no solo `aria-hidden`: una columna con `max-width: 0` sigue
        teniendo dentro botones alcanzables con el tabulador, y se tabulaba a
        ciegas hacia lo que la animación ya había tapado.
      */
      inert={colapsada}
      aria-hidden={colapsada ? 'true' : undefined}
      className={`columna-colapsable flex flex-col rounded-[24px] ${expandida ? 'min-w-0 flex-1' : 'shrink-0'} ${colapsada ? 'p-0' : 'p-6'} ${
        variante === 'rellena' ? 'bg-panel' : 'bg-fondo shadow-[inset_0_0_0_1px_var(--bitacora-filete)]'
      }`}
    >
      {/*
        El contenido guarda su ancho natural mientras la columna se cierra.
        Sin esto, cada línea se re-parte en cada cuadro de los 0.7s y las tres
        columnas reflúyen a la vez: el texto "baila" y se siente saturado. Con
        el ancho fijo, la columna se recorta como una persiana y el único
        reflujo que queda es el del panel de detalle al ganar sitio, que es el
        que de verdad aporta.
      */}
      <div
        style={{ minWidth: expandida ? undefined : ancho - 32 }}
        className="sin-barra-de-scroll -mx-2 min-h-0 flex-1 overflow-y-auto px-2"
      >
        {children}
      </div>
      {pie === undefined ? null : (
        <div style={{ minWidth: expandida ? undefined : ancho - 48 }} className="flex flex-col pt-4">
          {pie}
        </div>
      )}
    </section>
  )
}

/* Radio 16 y padding 8/24, como la referencia. El alto crece si hay segunda línea. */
const FILA = 'flex w-full cursor-pointer items-center gap-2 rounded-2xl px-6 py-2 text-left text-base'

function Fila({
  activa = false,
  icono,
  secundario,
  onClick,
  children,
}: {
  activa?: boolean
  icono: string
  secundario?: string
  onClick?: () => void
  children: ReactNode
}): ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={activa ? 'true' : undefined}
      className={`${FILA} transition-colors ${
        activa ? 'bg-ilustracion text-ilustracion-texto' : 'text-texto hover:bg-acento-tenue'
      }`}
    >
      <span
        aria-hidden="true"
        className={`material-symbols-rounded icono-relleno mt-0.5 shrink-0 self-start text-xl ${
          activa ? '' : '[color:var(--bitacora-ilustracion-texto)]'
        }`}
      >
        {icono}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className={secundario === undefined ? 'truncate' : 'line-clamp-2 leading-snug'}>{children}</span>
        {secundario === undefined ? null : (
          <span className={`truncate text-sm ${activa ? 'opacity-80' : 'text-texto-tenue'}`}>{secundario}</span>
        )}
      </span>
    </button>
  )
}

function AccionDeColumna({
  icono,
  children,
  onClick,
}: {
  icono: string
  children: string
  onClick?: () => void
}): ReactElement {
  return (
    <button type="button" onClick={onClick} className={`${FILA} text-texto transition-colors hover:bg-acento-tenue`}>
      <span aria-hidden="true" className="material-symbols-rounded icono-contorno shrink-0 text-xl">
        {icono}
      </span>
      {children}
    </button>
  )
}

export type PropsPantallaArchivo = {
  visibles: readonly ConferenciaVisible[]
  fichas: readonly Ficha[]
  temas: readonly Tema[]
  cargando: boolean
  error: string | null
  alCargarConferencia: () => void
  alValidar: (idFicha: string) => void
}

export function PantallaArchivo({
  visibles,
  fichas,
  temas,
  cargando,
  error,
  alCargarConferencia,
  alValidar,
}: PropsPantallaArchivo): ReactElement {
  const [evento, setEvento] = useState<string>(TODOS_EVENTOS)
  const [eje, setEje] = useState<Eje>('conferencias')
  /* `null` mientras no se haya bajado al tercer nivel: decide qué columna se colapsa. */
  const [rama, setRama] = useState<string | null>(null)
  const [idFicha, setIdFicha] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [ambito, setAmbito] = useState<Ambito>('seleccion')
  const [buscadorAbierto, setBuscadorAbierto] = useState(false)
  const [vista, setVista] = useState<Vista>('columnas')

  const pastillaDeBusqueda = useRef<HTMLDivElement>(null)
  const marco = useRef<HTMLDivElement>(null)

  const entradas = useMemo(() => fichasDelCatalogo(fichas, visibles), [fichas, visibles])

  const eventos = useMemo(
    () => Array.from(new Set(visibles.map((v) => v.conferencia.evento))),
    [visibles],
  )

  /* Filtrado en cascada: cada nivel acota lo que ve el siguiente. */
  const porEvento = useMemo(
    () => (evento === TODOS_EVENTOS ? entradas : entradas.filter((e) => e.conferencia.evento === evento)),
    [entradas, evento],
  )

  const conferenciasDelEvento = useMemo(
    () => visibles.filter((v) => evento === TODOS_EVENTOS || v.conferencia.evento === evento),
    [visibles, evento],
  )

  /* Solo los temas que de verdad aparecen: una lista con ceros no ayuda a elegir. */
  const temasPresentes = useMemo(() => {
    const ids = new Set(porEvento.map((e) => e.ficha.idTema))
    return temas.filter((t) => ids.has(t.id))
  }, [porEvento, temas])

  /* Cómo se llama la rama elegida. Lo piden la miga y el rótulo del buscador. */
  const nombreDeRama = useMemo(() => {
    if (rama === null || rama === TODOS) {
      return null
    }

    return eje === 'temas'
      ? (temas.find((t) => t.id === rama)?.nombre ?? null)
      : (visibles.find((v) => v.conferencia.id === rama)?.conferencia.titulo ?? null)
  }, [rama, eje, temas, visibles])

  /* Sin nada elegido, "esta selección" y "todo el archivo" son lo mismo. */
  const nombreDeLaSeleccion = useMemo(() => {
    const partes = [evento === TODOS_EVENTOS ? null : evento, nombreDeRama].filter(
      (parte): parte is string => parte !== null,
    )
    return partes.length === 0 ? null : partes.join(' · ')
  }, [evento, nombreDeRama])

  const textoBuscado = busqueda.trim().toLowerCase()

  /*
    El ámbito global es lo que hacía falta: la búsqueda deja de mirar la
    selección de columnas y recorre todo el archivo. Sin texto escrito no
    significa nada, así que no se aplica ni se anuncia.
  */
  const buscandoEnTodo = (ambito === 'todo' || nombreDeLaSeleccion === null) && textoBuscado.length > 0

  const fichasListadas = useMemo(() => {
    const base = buscandoEnTodo
      ? entradas
      : rama === null || rama === TODOS
        ? porEvento
        : porEvento.filter((e) => (eje === 'temas' ? e.ficha.idTema === rama : e.conferencia.id === rama))

    if (textoBuscado.length === 0) {
      return base
    }

    return base.filter(
      (e) =>
        e.ficha.fragmento.toLowerCase().includes(textoBuscado) ||
        e.conferencia.titulo.toLowerCase().includes(textoBuscado) ||
        nombreDeTema(temas, e.ficha.idTema).toLowerCase().includes(textoBuscado),
    )
  }, [entradas, porEvento, rama, eje, textoBuscado, buscandoEnTodo, temas])

  function limpiarBusqueda(): void {
    setBusqueda('')
    setAmbito('seleccion')
  }

  const activa: FichaDelCatalogo | undefined = fichasListadas.find((e) => e.ficha.id === idFicha)

  const visibleDeLaFicha =
    activa === undefined ? undefined : visibles.find((v) => v.conferencia.id === activa.conferencia.id)

  const puedeValidar =
    visibleDeLaFicha !== undefined &&
    (visibleDeLaFicha.procedencia === 'propia' || privacidadEfectiva(visibleDeLaFicha).permitirValidarFichas)

  /* En columnas, la de eventos se aparta al bajar al tercer nivel. En completa se ocultan todas menos la del nivel. */
  const enCompleta = vista === 'completa'
  const nivelActual: 'navegacion' | 'fichas' | 'detalle' =
    activa !== undefined ? 'detalle' : rama !== null || buscandoEnTodo ? 'fichas' : 'navegacion'

  /*
    La miga de pan. En columnas es una comodidad; en vista completa es lo único
    que dice dónde estás, porque las columnas de navegación están escondidas.
    Buscando en todo el archivo, la selección de columnas no describe nada: la
    miga pasa a ser la propia búsqueda.
  */
  type Miga = { clave: string; etiqueta: string; icono: string; onClick?: () => void }
  const migas: Miga[] = []

  if (buscandoEnTodo) {
    migas.push({ clave: 'busqueda', etiqueta: `Resultados de «${busqueda.trim()}»`, icono: 'search' })
  } else if (evento !== TODOS_EVENTOS || rama !== null) {
    migas.push({
      clave: 'evento',
      etiqueta: evento === TODOS_EVENTOS ? 'Todos los eventos' : evento,
      icono: evento === TODOS_EVENTOS ? 'inventory_2' : 'folder',
      onClick: () => {
        setRama(null)
        setIdFicha(null)
      },
    })

    if (rama !== null) {
      migas.push({
        clave: 'rama',
        etiqueta:
          rama === TODOS
            ? eje === 'temas'
              ? 'Todos los temas'
              : 'Todas las conferencias'
            : (nombreDeRama ?? 'Selección'),
        icono: rama === TODOS ? 'inventory_2' : eje === 'temas' ? 'label' : 'mic',
        onClick: () => setIdFicha(null),
      })
    }
  }

  if (activa !== undefined) {
    migas.push({
      clave: 'ficha',
      etiqueta: activa.ficha.fragmento,
      icono: ICONO_POR_VALIDACION[activa.ficha.estadoDeValidacion],
    })
  }

  const columnaDeEventos = (
    <Columna
      ancho={304}
      colapsada={rama !== null || (enCompleta && nivelActual !== 'navegacion')}
      pie={
        <AccionDeColumna icono="upload" onClick={alCargarConferencia}>
          Cargar conferencia
        </AccionDeColumna>
      }
    >
      <Fila
        icono="inventory_2"
        activa={evento === TODOS_EVENTOS}
        onClick={() => {
          setEvento(TODOS_EVENTOS)
          setIdFicha(null)
        }}
      >
        Todos los eventos
      </Fila>

      {eventos.map((nombre) => (
        <Fila
          key={nombre}
          icono="folder"
          secundario={`${visibles.filter((v) => v.conferencia.evento === nombre).length} conferencias`}
          activa={evento === nombre}
          onClick={() => {
            setEvento(nombre)
            setIdFicha(null)
          }}
        >
          {nombre}
        </Fila>
      ))}
    </Columna>
  )

  const columnaDeRamas = (
    <Columna
      ancho={304}
      expandida={enCompleta && nivelActual === 'navegacion'}
      colapsada={enCompleta && nivelActual !== 'navegacion'}
      pie={
        rama === null ? undefined : (
          <AccionDeColumna icono="arrow_back" onClick={() => setRama(null)}>
            Volver a los eventos
          </AccionDeColumna>
        )
      }
    >
      {/*
        Los dos ejes del segundo nivel. Cambiar de eje limpia la rama elegida:
        un id de tema no significa nada en la lista de conferencias.
      */}
      <div className="mb-2">
        <Segmentado
          opciones={EJES}
          valor={eje}
          alCambiar={(valor) => {
            setEje(valor)
            setRama(null)
            setIdFicha(null)
          }}
        />
      </div>

      <Fila
        icono="inventory_2"
        activa={rama === TODOS}
        onClick={() => {
          setRama(TODOS)
          setIdFicha(null)
        }}
      >
        {eje === 'temas' ? 'Todos los temas' : 'Todas las conferencias'}
      </Fila>

      {eje === 'temas'
        ? temasPresentes.map((t) => (
            <Fila
              key={t.id}
              icono="label"
              secundario={`${porEvento.filter((e) => e.ficha.idTema === t.id).length} fichas`}
              activa={rama === t.id}
              onClick={() => {
                setRama(t.id)
                setIdFicha(null)
              }}
            >
              {t.nombre}
            </Fila>
          ))
        : conferenciasDelEvento.map((v) => (
            <Fila
              key={v.conferencia.id}
              icono="mic"
              secundario={`${porEvento.filter((e) => e.conferencia.id === v.conferencia.id).length} fichas · ${v.conferencia.ponente}`}
              activa={rama === v.conferencia.id}
              onClick={() => {
                setRama(v.conferencia.id)
                setIdFicha(null)
              }}
            >
              {v.conferencia.titulo}
            </Fila>
          ))}
    </Columna>
  )

  const columnaDeFichas = (
    <Columna
      ancho={368}
      expandida={enCompleta && nivelActual === 'fichas'}
      colapsada={(rama === null && !buscandoEnTodo) || (enCompleta && nivelActual !== 'fichas')}
      pie={
        /* Buscando en todo el archivo no hay rama a la que volver: lo que cierra el paso es limpiar. */
        buscandoEnTodo ? (
          <AccionDeColumna icono="close" onClick={limpiarBusqueda}>
            Limpiar la búsqueda
          </AccionDeColumna>
        ) : (
          <AccionDeColumna icono="arrow_back" onClick={() => setRama(null)}>
            {eje === 'temas' ? 'Volver a los temas' : 'Volver a las conferencias'}
          </AccionDeColumna>
        )
      }
    >
      {fichasListadas.length === 0 ? (
        <p className="px-6 py-4 text-base text-texto-tenue">
          {textoBuscado.length === 0
            ? 'No hay fichas en esta selección.'
            : buscandoEnTodo
              ? 'Ninguna ficha del archivo coincide con lo que buscaste.'
              : `Ninguna ficha de ${nombreDeLaSeleccion} coincide. Prueba a buscar en todo el archivo.`}
        </p>
      ) : (
        fichasListadas.map((entrada) => (
          <Fila
            key={entrada.ficha.id}
            icono={ICONO_POR_VALIDACION[entrada.ficha.estadoDeValidacion]}
            /* Buscando en todo el archivo hace falta saber de dónde sale cada resultado. */
            secundario={
              buscandoEnTodo
                ? `${entrada.conferencia.titulo} · ${nombreDeTema(temas, entrada.ficha.idTema)}`
                : eje === 'temas'
                  ? entrada.conferencia.titulo
                  : `${nombreDeTema(temas, entrada.ficha.idTema)} · ${formatearTimestamp(entrada.ficha.segundoInicio)}`
            }
            activa={entrada.ficha.id === idFicha}
            onClick={() => setIdFicha(entrada.ficha.id)}
          >
            {entrada.ficha.fragmento}
          </Fila>
        ))
      )}
    </Columna>
  )

  const detalle = (
    <section className="flex min-w-0 flex-1 flex-col rounded-[24px] bg-fondo p-6 shadow-[inset_0_0_0_1px_var(--bitacora-filete)]">
      <div className="sin-barra-de-scroll -mx-2 min-h-0 flex-1 overflow-y-auto px-2">
        {activa === undefined ? (
          <div className="flex h-full items-center justify-center">
            <EstadoVacioIlustrado icono="description" mensaje="Selecciona una ficha para ver lo que dice" />
          </div>
        ) : (
          <article className="flex flex-col gap-6">
            <p className="text-xl leading-relaxed text-texto">{activa.ficha.fragmento}</p>

            <p className="text-base leading-relaxed text-texto-tenue">{activa.ficha.contextoMinimo}</p>

            <dl className="flex flex-col gap-3 border-t border-filete pt-5 text-base">
              <div className="flex items-center gap-3">
                <dt className="w-28 shrink-0 text-texto-tenue">Estado</dt>
                <dd>
                  <Insignia tono={TONO_POR_VALIDACION[activa.ficha.estadoDeValidacion]}>
                    {VALIDACION_EN_SINGULAR[activa.ficha.estadoDeValidacion]}
                  </Insignia>
                </dd>
              </div>
              <div className="flex items-center gap-3">
                <dt className="w-28 shrink-0 text-texto-tenue">Tipo</dt>
                <dd className="text-texto">{TIPO_EN_SINGULAR[activa.ficha.tipoDeUnidad]}</dd>
              </div>
              <div className="flex items-center gap-3">
                <dt className="w-28 shrink-0 text-texto-tenue">Minuto</dt>
                <dd className="coordenada text-texto">{formatearTimestamp(activa.ficha.segundoInicio)}</dd>
              </div>
              <div className="flex items-center gap-3">
                <dt className="w-28 shrink-0 text-texto-tenue">Tema</dt>
                <dd className="text-texto">{nombreDeTema(temas, activa.ficha.idTema)}</dd>
              </div>
              <div className="flex min-w-0 items-center gap-3">
                <dt className="w-28 shrink-0 text-texto-tenue">Conferencia</dt>
                <dd className="truncate text-texto">{activa.conferencia.titulo}</dd>
              </div>
            </dl>
          </article>
        )}
      </div>

      {activa === undefined ? null : (
        <div className="flex flex-col pt-4">
          {puedeValidar && activa.ficha.estadoDeValidacion !== 'validada' ? (
            <AccionDeColumna icono="check_circle" onClick={() => alValidar(activa.ficha.id)}>
              Marcar como validada
            </AccionDeColumna>
          ) : null}

          {/*
            "Ir a la conferencia" no navega fuera: lleva el propio explorador a
            esa charla. Antes salía a otra ruta y se perdía todo el recorrido,
            que es lo que lo hacía sentir roto.
          */}
          <AccionDeColumna
            icono="mic"
            onClick={() => {
              setEvento(activa.conferencia.evento)
              setEje('conferencias')
              setRama(activa.conferencia.id)
              setIdFicha(null)
            }}
          >
            Ver todas las fichas de esta conferencia
          </AccionDeColumna>

          <AccionDeColumna icono="arrow_back" onClick={() => setIdFicha(null)}>
            Volver a las fichas
          </AccionDeColumna>
        </div>
      )}
    </section>
  )

  return (
    <div ref={marco} className="flex min-h-0 flex-1 flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="font-titulo text-[32px] leading-none font-semibold text-texto">Conferencias</h1>

          <div className="flex flex-wrap items-center gap-3">
            {/*
              El buscador abre el modal anclado del sistema, que crece desde
              esta pastilla. Con algo escrito se rellena y aparece la ✕: antes
              el texto quedaba puesto sin forma de sacarlo si no era borrándolo
              a mano dentro del modal.
            */}
            <div
              ref={pastillaDeBusqueda}
              className={`flex h-10 items-center rounded-full transition-colors ${
                textoBuscado.length > 0 ? 'bg-acento text-acento-contraste' : 'bg-acento-tenue text-texto-tenue'
              }`}
            >
              <button
                type="button"
                onClick={() => setBuscadorAbierto(true)}
                className={`flex h-10 max-w-70 cursor-pointer items-center gap-2 rounded-full px-4 text-base transition-colors ${
                  textoBuscado.length > 0 ? '' : 'hover:text-texto'
                }`}
              >
                <span aria-hidden="true" className="material-symbols-rounded icono-contorno shrink-0 text-lg">
                  search
                </span>
                <span className="truncate">{textoBuscado.length > 0 ? busqueda.trim() : 'Buscar'}</span>
              </button>

              {textoBuscado.length > 0 ? (
                <button
                  type="button"
                  onClick={limpiarBusqueda}
                  aria-label="Limpiar la búsqueda"
                  className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full opacity-70 transition-opacity hover:opacity-100"
                >
                  <span aria-hidden="true" className="material-symbols-rounded icono-contorno text-lg">
                    close
                  </span>
                </button>
              ) : null}
            </div>

            <SelectorDeVista opciones={VISTAS} valor={vista} alCambiar={setVista} />

            <BotonPildora variante="primario" icono="upload" onClick={alCargarConferencia}>
              Cargar conferencia
            </BotonPildora>
          </div>
        </div>

        {migas.length === 0 ? null : (
          <nav aria-label="Ubicación">
            <ol className="flex flex-wrap items-center gap-1 text-sm">
              {migas.map((miga, indice) => {
                /* La última es dónde estás: se ve, no se pulsa. */
                const esUltima = indice === migas.length - 1
                const contenido = (
                  <>
                    <span aria-hidden="true" className="material-symbols-rounded icono-relleno shrink-0 text-base">
                      {miga.icono}
                    </span>
                    <span className="max-w-70 truncate">{miga.etiqueta}</span>
                  </>
                )

                return (
                  <li key={miga.clave} className="flex min-w-0 items-center gap-1">
                    {indice === 0 ? null : (
                      <span
                        aria-hidden="true"
                        className="material-symbols-rounded icono-contorno shrink-0 text-base text-texto-tenue"
                      >
                        chevron_right
                      </span>
                    )}

                    {esUltima ? (
                      <span aria-current="page" className="flex min-w-0 items-center gap-1.5 px-2 py-1 text-texto">
                        {contenido}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={miga.onClick}
                        className="flex min-w-0 cursor-pointer items-center gap-1.5 rounded-full px-2 py-1 text-texto-tenue transition-colors hover:bg-acento-tenue hover:text-texto"
                      >
                        {contenido}
                      </button>
                    )}
                  </li>
                )
              })}
            </ol>
          </nav>
        )}
      </div>

      {cargando ? (
        <Esqueleto filas={4} etiqueta="Cargando el archivo" />
      ) : error !== null ? (
        <PanelDeError mensaje={error} />
      ) : (
        <div className="flex min-h-0 flex-1 gap-2">
          {columnaDeEventos}
          {columnaDeRamas}
          {columnaDeFichas}
          {enCompleta && nivelActual !== 'detalle' ? null : detalle}
        </div>
      )}

      <Modal
        abierto={buscadorAbierto}
        alCerrar={() => setBuscadorAbierto(false)}
        titulo="Buscar"
        anclaje="disparador"
        anclaEn={pastillaDeBusqueda}
        ancho="angosto"
        limites={marco}
      >
        <input
          autoFocus
          type="search"
          value={busqueda}
          onChange={(cambio) => setBusqueda(cambio.target.value)}
          placeholder="Fragmento, conferencia o tema"
          aria-label="Buscar entre las fichas"
          className="block h-12 w-full rounded-full bg-acento-tenue px-5 text-base text-texto placeholder:text-texto-tenue focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        />

        {/*
          El ámbito solo se ofrece cuando hay selección: sin nada elegido las
          dos opciones buscan sobre lo mismo y el control sería decorativo.
        */}
        {nombreDeLaSeleccion === null ? null : <Segmentado opciones={AMBITOS} valor={ambito} alCambiar={setAmbito} />}

        <p className="text-sm text-texto-tenue">
          {textoBuscado.length === 0
            ? buscandoEnTodo || nombreDeLaSeleccion === null || ambito === 'todo'
              ? 'Busca entre todas las fichas del archivo.'
              : `Busca solo dentro de ${nombreDeLaSeleccion}.`
            : `${fichasListadas.length} ${fichasListadas.length === 1 ? 'ficha' : 'fichas'} ${
                buscandoEnTodo ? 'en todo el archivo' : `en ${nombreDeLaSeleccion}`
              }`}
        </p>
      </Modal>
    </div>
  )
}
