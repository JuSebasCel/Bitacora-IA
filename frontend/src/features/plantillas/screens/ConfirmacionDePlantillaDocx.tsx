import type { ReactElement } from 'react'
import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router'
import { mensajeDeError } from '@/shared/errors'
import { ModalDeConfirmacion, PanelDeError, useCrecerDesdeOrigen } from '@/shared/ui'
import { VistaPreviaDeDocx } from '../components'
import type {
  ComportamientoSiVacio,
  ExtensionDeCampo,
  FormatoDeMarcador,
  ModoDeCampo,
  MarcadorDeDocx,
  MarcadorSimpleDeDocx,
  PlantillaDesdeDocx,
} from '../data'
import { nombreDeMarcador } from '../plantillas'
import { useDocxDePlantilla } from '../useDocxDePlantilla'

/*
  Configurar una plantilla: la hoja a la izquierda, sus campos a la derecha.

  Es la pantalla donde se hace el único trabajo que la app pide sobre una
  plantilla — decir qué debe escribir la IA en cada `[[marcador]]`. El diseño
  no se toca aquí: se hizo en Word y el archivo se conserva intacto. Por eso la
  hoja es de solo lectura y la columna de la derecha es la que se edita.

  Se llamaba "confirmación" porque antes solo enseñaba los marcadores que se
  habían reconocido, sin nada que rellenar: a qué se ligaba cada uno se dejaba
  a una IA que nunca llegó a existir, y un marcador personalizado acababa
  saliendo con texto de ejemplo. Ahora cada campo lleva su instrucción.

  Todo se guarda solo, sobre la marcha (`usePlantillas` agrupa los cambios con
  un temporizador): no hay botón de guardar porque no hay nada que se pueda
  perder por no pulsarlo.
*/

export type PropsConfirmacionDePlantillaDocx = {
  plantilla: PlantillaDesdeDocx
  alRenombrar: (nombre: string) => void
  alCambiarMarcadores: (marcadores: readonly MarcadorDeDocx[]) => void
  alEliminar: () => void | Promise<void>
}

const CAMPO =
  'w-full rounded-2xl bg-acento-tenue px-4 text-base text-texto placeholder:text-texto-tenue focus:outline-2 focus:outline-offset-2 focus:outline-acento'

const FORMATOS: readonly { valor: FormatoDeMarcador; etiqueta: string }[] = [
  { valor: 'parrafo', etiqueta: 'Párrafo' },
  { valor: 'lista_vinetas', etiqueta: 'Viñetas' },
  { valor: 'lista_numerada', etiqueta: 'Numerada' },
]

/*
  Las opciones de cada campo, cada una con la línea que dice qué hace.

  Sin esa línea eran botones con una palabra —"Párrafo", "Quitar el
  renglón"— y quedaba a la intuición de cada uno qué cambiaba al pulsarlos.
  Una configuración que se hace una vez y vale para todas las memorias es
  justo la que tiene que entenderse sin probar.
*/
const MODOS: readonly { valor: ModoDeCampo; etiqueta: string }[] = [
  { valor: 'redactar', etiqueta: 'Redactado por la IA' },
  { valor: 'cita', etiqueta: 'Cita literal' },
]

const EXTENSIONES: readonly { valor: ExtensionDeCampo; etiqueta: string }[] = [
  { valor: 'breve', etiqueta: 'Breve' },
  { valor: 'media', etiqueta: 'Un párrafo' },
  { valor: 'extensa', etiqueta: 'Extensa' },
]

/*
  Puntos de partida para la instrucción, no plantillas cerradas.

  Una caja de texto vacía es donde más se atasca quien configura: no sabe qué
  nivel de detalle espera la IA. Pulsar una sugerencia la escribe y se sigue
  editando; con eso se ve también cómo se redacta una buena instrucción.
*/
const SUGERENCIAS: readonly { etiqueta: string; texto: string }[] = [
  { etiqueta: 'La tesis', texto: 'Resume la tesis principal que defendió el ponente y el argumento con que la sostuvo.' },
  { etiqueta: 'El método', texto: 'Explica el método o el enfoque que presentó, en el orden en que lo contó.' },
  { etiqueta: 'Las cifras', texto: 'Recoge los datos y cifras concretos que dio, con su contexto.' },
  { etiqueta: 'Las conclusiones', texto: 'Resume las conclusiones y las recomendaciones con que cerró.' },
]

/*
  Qué pasa si la conferencia no da material para este campo.

  "Quitar el renglón" y no "quitar la sección": un marcador simple ocupa un
  párrafo, y eso es lo que se va — para quitar un tramo más largo está el
  marcador `[[SI: …]]` de Word, que envuelve lo que haga falta.
*/
const SI_VACIO: readonly { valor: ComportamientoSiVacio; etiqueta: string }[] = [
  { valor: 'dejar-vacio', etiqueta: 'Dejarlo en blanco' },
  { valor: 'quitar', etiqueta: 'Quitar el renglón' },
  { valor: 'avisar', etiqueta: 'Avisarme' },
]

const AYUDA_DE_SI_VACIO: Record<ComportamientoSiVacio, string> = {
  'dejar-vacio': 'El campo queda vacío y el resto de la hoja no se mueve.',
  quitar: 'Se borra el renglón entero, con su rótulo, para que no quede un título sin nada debajo.',
  avisar: 'Queda vacío y, al abrir la memoria, te avisamos para que lo revises antes de enviarla.',
}

function tieneInstruccion(marcador: MarcadorDeDocx): boolean {
  return marcador.tipo === 'simple' && (marcador.instruccion ?? '').trim() !== ''
}

export function ConfirmacionDePlantillaDocx({
  plantilla,
  alRenombrar,
  alCambiarMarcadores,
  alEliminar,
}: PropsConfirmacionDePlantillaDocx): ReactElement {
  const { archivo, codigoDeError } = useDocxDePlantilla(plantilla.rutaArchivoOriginal)
  const [nombre, setNombre] = useState(plantilla.nombre)
  const [urlDeDescarga, setUrlDeDescarga] = useState<string | null>(null)
  const [borradoAbierto, setBorradoAbierto] = useState(false)
  const botonDeBorrado = useRef<HTMLButtonElement>(null)
  const pantalla = useRef<HTMLDivElement>(null)
  useCrecerDesdeOrigen(pantalla)

  const campos = plantilla.marcadores.filter((marcador): marcador is MarcadorSimpleDeDocx => marcador.tipo === 'simple')
  const listos = campos.filter(tieneInstruccion).length

  /*
    Se abre el primero que falte, no el primero de la lista: al entrar, lo que
    hay que hacer es lo que está sin hacer. Con todo listo, ninguno abierto.
  */
  const [abierto, setAbierto] = useState<string | null>(
    () => campos.find((marcador) => !tieneInstruccion(marcador))?.id ?? null,
  )

  useEffect(() => {
    if (archivo === null) {
      setUrlDeDescarga(null)
      return
    }

    const url = URL.createObjectURL(archivo)
    setUrlDeDescarga(url)

    return () => URL.revokeObjectURL(url)
  }, [archivo])

  function cambiarMarcador(id: string, cambio: Partial<MarcadorSimpleDeDocx>): void {
    alCambiarMarcadores(
      plantilla.marcadores.map((marcador) =>
        marcador.id === id && marcador.tipo === 'simple' ? { ...marcador, ...cambio } : marcador,
      ),
    )
  }

  return (
    <div ref={pantalla} className="flex min-h-0 flex-1 flex-col gap-6">
      <h1 className="sr-only">Plantilla: {plantilla.nombre}</h1>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Link
            to="/plantillas"
            aria-label="Volver a plantillas"
            className="flex w-fit items-center gap-1 rounded-full py-1 pr-2 text-sm text-texto-tenue transition-colors hover:text-texto"
          >
            <span aria-hidden="true" className="material-symbols-rounded icono-contorno text-base">
              arrow_back
            </span>
            Plantillas
          </Link>

          {/*
            El nombre es el título y se edita en el sitio. Un campo con rótulo
            aparte convertiría la cabecera en un formulario; así se lee como lo
            que es, y se corrige tocándolo.
          */}
          <input
            value={nombre}
            onChange={(evento) => {
              setNombre(evento.target.value)
              alRenombrar(evento.target.value)
            }}
            /* Enter confirma el nombre, como en cualquier título que se edita en su sitio. */
            onKeyDown={(evento) => {
              if (evento.key === 'Enter') {
                evento.currentTarget.blur()
              }
            }}
            aria-label="Nombre de la plantilla"
            className="-mx-2 min-w-0 rounded-xl bg-transparent px-2 font-titulo text-[32px] leading-tight font-semibold text-texto transition-colors hover:bg-acento-tenue focus:bg-acento-tenue focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 pt-7">
          {urlDeDescarga === null ? null : (
            <a
              href={urlDeDescarga}
              download={`${nombre.trim().length > 0 ? nombre.trim() : 'plantilla'}.docx`}
              className="flex h-10 items-center gap-2 rounded-full bg-acento-tenue px-4 text-sm text-texto-tenue transition-colors hover:text-texto"
            >
              <span aria-hidden="true" className="material-symbols-rounded icono-contorno text-lg">
                download
              </span>
              Descargar el .docx
            </a>
          )}

          <button
            ref={botonDeBorrado}
            type="button"
            onClick={() => setBorradoAbierto(true)}
            aria-label="Borrar la plantilla"
            className="flex size-10 cursor-pointer items-center justify-center rounded-full bg-acento-tenue text-texto-tenue transition-colors hover:text-error"
          >
            <span aria-hidden="true" className="material-symbols-rounded icono-contorno text-lg">
              delete
            </span>
          </button>
        </div>
      </div>

      {/*
        Descargar el archivo puede fallar sin que la plantilla esté mal: los
        marcadores viven en la fila y se siguen pudiendo configurar. Se dice,
        en vez de dejar la hoja vacía insinuando que el documento se perdió.
      */}
      {codigoDeError === null ? null : <PanelDeError mensaje={mensajeDeError(codigoDeError)} />}

      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
        <section
          aria-label="Vista previa"
          className="flex min-h-[28rem] min-w-0 flex-1 flex-col rounded-[24px] bg-panel p-4">
          <div className="sin-barra-de-scroll min-h-0 flex-1 overflow-y-auto rounded-2xl">
            <VistaPreviaDeDocx blob={archivo} resaltarMarcadores />
          </div>
        </section>

        <section aria-label="Campos" className="flex min-h-0 flex-col gap-3 rounded-[24px] bg-panel p-4 lg:w-[27rem]">
          <div className="flex items-baseline justify-between gap-3 px-2">
            <h2 className="font-titulo text-xl leading-tight font-semibold text-texto">Qué va en cada campo</h2>
            {campos.length === 0 ? null : (
              <span className="shrink-0 text-sm text-texto-tenue">
                {listos} de {campos.length} listos
              </span>
            )}
          </div>

          {plantilla.marcadores.length === 0 ? (
            /*
              Sin marcadores no hay nada que configurar, y el motivo más
              probable es que no se escribieron, no que la app no los viera.
              Se explica cómo se escriben en vez de solo constatar la ausencia.
            */
            <div className="flex flex-col gap-3 rounded-[20px] bg-fondo p-5">
              <p className="text-base text-texto">No encontramos ningún campo en este archivo.</p>
              <p className="text-sm leading-relaxed text-texto-tenue">
                Ábrelo en Word y escribe, donde va cada contenido, su nombre entre dobles corchetes:
              </p>
              <code className="w-fit rounded-lg bg-acento-tenue px-2 py-1 font-mono text-sm text-texto">
                [[Resumen de la tesis]]
              </code>
              <p className="text-sm leading-relaxed text-texto-tenue">Luego vuelve a subirlo.</p>
            </div>
          ) : (
            <ul className="sin-barra-de-scroll flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
              {plantilla.marcadores.map((marcador) =>
                marcador.tipo === 'simple' ? (
                  <CampoConfigurable
                    key={marcador.id}
                    marcador={marcador}
                    abierto={abierto === marcador.id}
                    alAlternar={() => setAbierto((actual) => (actual === marcador.id ? null : marcador.id))}
                    alCambiar={(cambio) => cambiarMarcador(marcador.id, cambio)}
                  />
                ) : (
                  <SeccionDeWord key={marcador.id} marcador={marcador} />
                ),
              )}
            </ul>
          )}
        </section>
      </div>

      <ModalDeConfirmacion
        abierto={borradoAbierto}
        alCerrar={() => setBorradoAbierto(false)}
        titulo="Borrar la plantilla"
        accion="Borrar"
        anclaEn={botonDeBorrado}
        consecuencias={[
          'Se borra el archivo de Word que subiste y las instrucciones de cada campo.',
          /* `memorias.id_plantilla` es `on delete cascade`: no quedan huérfanas, desaparecen. */
          'Se borran también todas las memorias que se generaron con ella.',
        ]}
        alConfirmar={async () => {
          setBorradoAbierto(false)
          await alEliminar()
        }}
      >
        <p className="text-base text-texto">«{plantilla.nombre}»</p>
      </ModalDeConfirmacion>
    </div>
  )
}

/*
  Un campo de la plantilla, plegado o abierto.

  Plegado dice lo justo para saber si ya está: su nombre y si tiene
  instrucción. Abierto enseña dónde cae en el documento —el párrafo que lo
  rodea, con el campo resaltado— porque "Resumen" solo no dice si es el de
  la portada o el de la tercera página, y la instrucción depende de eso.

  Las opciones van en el orden en que se piensan: qué se quiere, si se redacta
  o se copia, cuánto ocupa, cómo se presenta, y qué pasa si no hay de dónde
  sacarlo. Extensión y formato desaparecen con la cita literal: una cita mide
  lo que mide, y partirla en viñetas la desfiguraría.
*/
function CampoConfigurable({
  marcador,
  abierto,
  alAlternar,
  alCambiar,
}: {
  marcador: MarcadorSimpleDeDocx
  abierto: boolean
  alAlternar: () => void
  alCambiar: (cambio: Partial<MarcadorSimpleDeDocx>) => void
}): ReactElement {
  const listo = tieneInstruccion(marcador)
  const indice = marcador.contexto.indexOf(marcador.textoOriginal)
  const modo = marcador.modo ?? 'redactar'
  const siVacio = marcador.siVacio ?? 'dejar-vacio'

  return (
    <li className={`flex flex-col rounded-[20px] transition-colors ${abierto ? 'bg-fondo' : ''}`}>
      <button
        type="button"
        onClick={alAlternar}
        aria-expanded={abierto}
        className={`flex w-full cursor-pointer items-center gap-3 rounded-[20px] px-4 py-3 text-left transition-colors ${
          abierto ? '' : 'hover:bg-acento-tenue'
        }`}
      >
        <span className="min-w-0 flex-1 truncate text-base text-texto">{nombreDeMarcador(marcador.textoOriginal)}</span>

        <span className={`flex shrink-0 items-center gap-1 text-sm ${listo ? 'text-texto' : 'text-texto-tenue'}`}>
          <span aria-hidden="true" className="material-symbols-rounded icono-relleno text-base">
            {listo ? 'check_circle' : 'radio_button_unchecked'}
          </span>
          {listo ? 'Listo' : 'Falta'}
        </span>

        <span
          aria-hidden="true"
          className={`material-symbols-rounded icono-contorno text-lg text-texto-tenue transition-transform ${abierto ? 'rotate-180' : ''}`}
        >
          expand_more
        </span>
      </button>

      {abierto ? (
        <div className="flex flex-col gap-5 px-4 pb-5">
          <p className="text-sm leading-relaxed text-texto-tenue">
            {indice === -1 ? (
              marcador.contexto
            ) : (
              <>
                {marcador.contexto.slice(0, indice)}
                <mark className="rounded bg-ilustracion px-1 font-mono text-ilustracion-texto">{marcador.textoOriginal}</mark>
                {marcador.contexto.slice(indice + marcador.textoOriginal.length)}
              </>
            )}
          </p>

          <div className="flex flex-col gap-2">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-texto">Qué debe ir aquí</span>
              <textarea
                value={marcador.instruccion ?? ''}
                onChange={(evento) => alCambiar({ instruccion: evento.target.value })}
                rows={3}
                placeholder="Ej. Resume en dos párrafos la tesis principal del ponente."
                className={`${CAMPO} resize-none py-3 leading-relaxed`}
              />
            </label>

            {/* Solo con la caja vacía: con algo escrito, una sugerencia pisaría el trabajo de alguien. */}
            {(marcador.instruccion ?? '').trim() === '' ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-texto-tenue">Empezar con:</span>
                {SUGERENCIAS.map((sugerencia) => (
                  <button
                    key={sugerencia.etiqueta}
                    type="button"
                    onClick={() => alCambiar({ instruccion: sugerencia.texto })}
                    className="cursor-pointer rounded-full bg-acento-tenue px-2.5 py-1 text-xs text-texto-tenue transition-colors hover:text-texto"
                  >
                    {sugerencia.etiqueta}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs leading-relaxed text-texto-tenue">
                Cuanto más concreta, mejor: di qué parte de la charla buscar y para quién se escribe.
              </p>
            )}
          </div>

          <GrupoDePastillas
            titulo="Tipo de texto"
            ayuda={
              modo === 'cita'
                ? 'Copia palabra por palabra el fragmento de la charla que mejor responda. No lo reescribe.'
                : 'La IA lo escribe con sus palabras a partir de lo que se dijo, sin añadir nada que no esté.'
            }
            opciones={MODOS}
            valor={modo}
            alCambiar={(valor) => alCambiar({ modo: valor })}
          />

          {modo === 'cita' ? null : (
            <>
              <GrupoDePastillas
                titulo="Extensión"
                ayuda="Cuánto ocupa en la hoja. Si el campo tiene poco sitio en tu diseño, elige breve: un texto largo empuja todo lo de debajo."
                opciones={EXTENSIONES}
                valor={marcador.extension ?? 'media'}
                alCambiar={(valor) => alCambiar({ extension: valor })}
              />

              <GrupoDePastillas
                titulo="Cómo se presenta"
                ayuda="Las viñetas y la numeración las pone la app, con el formato que el campo tiene en Word."
                opciones={FORMATOS}
                valor={marcador.formato}
                alCambiar={(formato) => alCambiar({ formato })}
              />
            </>
          )}

          <GrupoDePastillas
            titulo="Si la charla no da para esto"
            ayuda={AYUDA_DE_SI_VACIO[siVacio]}
            opciones={SI_VACIO}
            valor={siVacio}
            alCambiar={(valor) => alCambiar({ siVacio: valor })}
          />
        </div>
      ) : null}
    </li>
  )
}

/*
  Un tramo condicional o repetible, escrito en Word con `[[SI: …]]` o
  `[[REPETIR: …]]`. No lleva instrucción: su contenido ya lo escribió quien
  diseñó la plantilla, y lo único que decide la app es si aparece o cuántas
  veces. Se lista para que se sepa que se reconoció.
*/
function SeccionDeWord({ marcador }: { marcador: Exclude<MarcadorDeDocx, MarcadorSimpleDeDocx> }): ReactElement {
  return (
    <li className="flex items-center gap-3 rounded-[20px] px-4 py-3">
      <span aria-hidden="true" className="material-symbols-rounded icono-contorno text-lg text-texto-tenue">
        {marcador.tipo === 'condicional' ? 'rule' : 'repeat'}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base text-texto">{marcador.descripcion}</span>
        <span className="block text-sm text-texto-tenue">
          {marcador.tipo === 'condicional' ? 'Tramo que aparece solo si hay datos' : 'Tramo que se repite'}
        </span>
      </span>
    </li>
  )
}

function GrupoDePastillas<T extends string>({
  titulo,
  ayuda,
  opciones,
  valor,
  alCambiar,
}: {
  titulo: string
  /* Lo que hace la opción elegida, dicho en una línea. Cambia con la elección. */
  ayuda?: string
  opciones: readonly { valor: T; etiqueta: string }[]
  valor: T
  alCambiar: (valor: T) => void
}): ReactElement {
  /* Un nombre por grupo: sin él, las flechas del teclado no saltan entre las opciones de un mismo grupo. */
  const nombre = useId()

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-medium text-texto">{titulo}</legend>
      <div className="flex flex-wrap gap-1.5">
        {opciones.map((opcion) => {
          const activa = opcion.valor === valor

          return (
            <label
              key={opcion.valor}
              className={`relative cursor-pointer rounded-full px-3 py-1.5 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-acento ${
                activa ? 'bg-acento text-acento-contraste' : 'bg-acento-tenue text-texto-tenue hover:text-texto'
              }`}
            >
              <input
                type="radio"
                name={nombre}
                checked={activa}
                onChange={() => alCambiar(opcion.valor)}
                className="absolute inset-0 cursor-pointer appearance-none opacity-0"
              />
              {opcion.etiqueta}
            </label>
          )
        })}
      </div>
      {ayuda === undefined ? null : <p className="text-xs leading-relaxed text-texto-tenue">{ayuda}</p>}
    </fieldset>
  )
}
