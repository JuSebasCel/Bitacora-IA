import type { ReactElement } from 'react'
import { PRESETS_DE_TONO, TONO_POR_DEFECTO } from '../tono'
import type { TonoDePlantilla } from '../tono'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { mensajeDeError } from '@/shared/errors'
import {
  CLASES_DE_PILDORA,
  colorPorClave,
  ModalDeConfirmacion,
  PanelDeError,
  SelectorDeOpciones,
  useCrecerDesdeOrigen,
} from '@/shared/ui'
import type { OpcionDeSelector } from '@/shared/ui'
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
  /** Opcional para que las pantallas de prueba no tengan que pasarlo. */
  alCambiarTono?: (tono: TonoDePlantilla) => void
  alEliminar: () => void | Promise<void>
}

const CAMPO =
  'w-full rounded-2xl bg-acento-tenue px-4 text-base text-texto placeholder:text-texto-tenue focus:outline-2 focus:outline-offset-2 focus:outline-acento'

/*
  Las opciones de cada campo, como campos desplegables de ancho completo (los
  de la referencia) en vez de filas de pastillas con una línea de ayuda bajo
  cada una, que saturaban el panel. El campo dice qué se configura
  ("Extensión") y enseña el valor elegido en tenue; adentro se elige.
*/
const MODOS: readonly OpcionDeSelector<ModoDeCampo>[] = [
  { valor: 'redactar', etiqueta: 'Redactado por la IA', icono: 'auto_awesome' },
  { valor: 'cita', etiqueta: 'Cita literal', icono: 'format_quote' },
]

const EXTENSIONES: readonly OpcionDeSelector<ExtensionDeCampo>[] = [
  { valor: 'breve', etiqueta: 'Breve', icono: 'short_text' },
  { valor: 'media', etiqueta: 'Un párrafo', icono: 'notes' },
  { valor: 'extensa', etiqueta: 'Varios párrafos', icono: 'article' },
]

const FORMATOS: readonly OpcionDeSelector<FormatoDeMarcador>[] = [
  { valor: 'parrafo', etiqueta: 'Párrafo', icono: 'subject' },
  { valor: 'lista_vinetas', etiqueta: 'Viñetas', icono: 'format_list_bulleted' },
  { valor: 'lista_numerada', etiqueta: 'Numerada', icono: 'format_list_numbered' },
]

/*
  "Quitar el renglón" y no "quitar la sección": un marcador simple ocupa un
  párrafo, y eso es lo que se va; para quitar un tramo más largo está el
  marcador `[[SI: ...]]` de Word, que envuelve lo que haga falta.
*/
const SI_VACIO: readonly OpcionDeSelector<ComportamientoSiVacio>[] = [
  { valor: 'dejar-vacio', etiqueta: 'Dejarlo en blanco', icono: 'check_box_outline_blank' },
  { valor: 'quitar', etiqueta: 'Quitar el renglón', icono: 'backspace' },
  { valor: 'avisar', etiqueta: 'Avisarme', icono: 'notifications' },
]

/*
  Puntos de partida para la instrucción, no plantillas cerradas: una caja
  vacía es donde más se atasca quien configura. Pulsar una la escribe y se
  sigue editando.
*/
const SUGERENCIAS: readonly { etiqueta: string; texto: string }[] = [
  { etiqueta: 'La tesis', texto: 'Resume la tesis principal que defendió el ponente y el argumento con que la sostuvo.' },
  { etiqueta: 'El método', texto: 'Explica el método o el enfoque que presentó, en el orden en que lo contó.' },
  { etiqueta: 'Las cifras', texto: 'Recoge los datos y cifras concretos que dio, con su contexto.' },
  { etiqueta: 'Las conclusiones', texto: 'Resume las conclusiones y las recomendaciones con que cerró.' },
]

function tieneInstruccion(marcador: MarcadorDeDocx): boolean {
  return marcador.tipo === 'simple' && (marcador.instruccion ?? '').trim() !== ''
}

export function ConfirmacionDePlantillaDocx({
  plantilla,
  alRenombrar,
  alCambiarMarcadores,
  alCambiarTono,
  alEliminar,
}: PropsConfirmacionDePlantillaDocx): ReactElement {
  const { archivo, codigoDeError } = useDocxDePlantilla(plantilla.rutaArchivoOriginal)
  const [nombre, setNombre] = useState(plantilla.nombre)
  /* El nombre de antes de empezar a editar, para que Escape lo devuelva. `null` = no se está editando. */
  const [nombreAlEditar, setNombreAlEditar] = useState<string | null>(null)
  const [urlDeDescarga, setUrlDeDescarga] = useState<string | null>(null)
  const [borradoAbierto, setBorradoAbierto] = useState(false)
  const botonDeBorrado = useRef<HTMLButtonElement>(null)
  const pantalla = useRef<HTMLDivElement>(null)
  useCrecerDesdeOrigen(pantalla, plantilla.id)

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
            El nombre es el título y se edita en el sitio, con doble clic,
            como un archivo en el escritorio. Siempre editable era un campo de
            texto disfrazado: un clic suelto para seleccionar o copiar el
            título ya dejaba el cursor dentro. Con el teclado, Enter o F2.
          */}
          {nombreAlEditar === null ? (
            <div
              role="button"
              tabIndex={0}
              onDoubleClick={() => setNombreAlEditar(nombre)}
              onKeyDown={(evento) => {
                if (evento.key === 'Enter' || evento.key === 'F2') {
                  evento.preventDefault()
                  setNombreAlEditar(nombre)
                }
              }}
              aria-label={`Nombre de la plantilla: ${nombre}. Doble clic para cambiarlo`}
              title="Doble clic para cambiar el nombre"
              className="-mx-2 min-w-0 cursor-default truncate rounded-xl px-2 font-titulo text-[32px] leading-tight font-semibold text-texto select-none focus:outline-2 focus:outline-acento"
            >
              {nombre}
            </div>
          ) : (
            <input
              value={nombre}
              autoFocus
              onFocus={(evento) => evento.currentTarget.select()}
              onChange={(evento) => {
                setNombre(evento.target.value)
                alRenombrar(evento.target.value)
              }}
              onBlur={() => {
                /* Una plantilla sin nombre no se guarda: salir en blanco devuelve el de antes. */
                if (nombre.trim() === '' && nombreAlEditar !== null) {
                  setNombre(nombreAlEditar)
                  alRenombrar(nombreAlEditar)
                }
                setNombreAlEditar(null)
              }}
              onKeyDown={(evento) => {
                if (evento.key === 'Enter') {
                  evento.currentTarget.blur()
                }

                if (evento.key === 'Escape') {
                  setNombre(nombreAlEditar)
                  alRenombrar(nombreAlEditar)
                  setNombreAlEditar(null)
                }
              }}
              aria-label="Nombre de la plantilla"
              className="-mx-2 min-w-0 rounded-xl bg-acento-tenue px-2 font-titulo text-[32px] leading-tight font-semibold text-texto focus:outline-none"
            />
          )}
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
          <div className="min-h-0 flex-1">
            <VistaPreviaDeDocx blob={archivo} resaltarMarcadores conZoom />
          </div>
        </section>

        <section aria-label="Campos" className="flex min-h-0 flex-col gap-3 rounded-[24px] bg-panel p-4 lg:w-[27rem]">
          <div className="flex items-baseline justify-between gap-3 px-2">
            <h2 className="font-titulo text-xl leading-tight font-semibold text-texto">Qué va en cada campo</h2>
            {campos.length === 0 ? null : (
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                  listos === campos.length ? CLASES_DE_PILDORA.verde : CLASES_DE_PILDORA.ambar
                }`}
              >
                {listos} de {campos.length} listos
              </span>
            )}
          </div>

          {alCambiarTono === undefined || plantilla.marcadores.length === 0 ? null : (
            <SelectorDeTono tono={plantilla.tono ?? TONO_POR_DEFECTO} alCambiar={alCambiarTono} />
          )}

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

  /* Un color por campo, siempre el mismo: su disco en la lista y su marcador en el contexto. */
  const color = colorPorClave(marcador.id)

  return (
    <li className={`flex flex-col rounded-[20px] transition-colors ${abierto ? 'bg-fondo' : ''}`}>
      <button
        type="button"
        onClick={alAlternar}
        aria-expanded={abierto}
        className={`flex w-full cursor-pointer items-center gap-3 rounded-[20px] px-3 py-2.5 text-left transition-colors ${
          abierto ? '' : 'hover:bg-acento-tenue'
        }`}
      >
        <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${CLASES_DE_PILDORA[color]}`}>
          <span aria-hidden="true" className="material-symbols-rounded icono-relleno text-lg">
            {modo === 'cita' ? 'format_quote' : 'data_object'}
          </span>
        </span>

        <span className="min-w-0 flex-1 truncate text-base text-texto">{nombreDeMarcador(marcador.textoOriginal)}</span>

        <span
          className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
            listo ? CLASES_DE_PILDORA.verde : CLASES_DE_PILDORA.ambar
          }`}
        >
          <span aria-hidden="true" className="material-symbols-rounded icono-relleno text-sm">
            {listo ? 'check_circle' : 'pending'}
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
        <div className="flex flex-col gap-3 px-3 pb-4">
          <p className="px-1 text-sm leading-relaxed text-texto-tenue">
            {indice === -1 ? (
              marcador.contexto
            ) : (
              <>
                {marcador.contexto.slice(0, indice)}
                <mark className={`rounded-md px-1 font-mono ${CLASES_DE_PILDORA[color]}`}>{marcador.textoOriginal}</mark>
                {marcador.contexto.slice(indice + marcador.textoOriginal.length)}
              </>
            )}
          </p>

          <textarea
            value={marcador.instruccion ?? ''}
            onChange={(evento) => alCambiar({ instruccion: evento.target.value })}
            rows={3}
            aria-label="Qué debe escribir la IA aquí"
            placeholder="Qué debe escribir la IA aquí"
            className={`${CAMPO} resize-none py-3 leading-relaxed`}
          />

          {/* Solo con la caja vacía: con algo escrito, una sugerencia pisaría el trabajo de alguien. */}
          {(marcador.instruccion ?? '').trim() === '' ? (
            /*
              Con su rótulo y con forma de botón: en color se leían como
              etiquetas informativas, no como algo que se pulsa. El "+" y el
              negro al pasar por encima dicen que escriben en la caja.
            */
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="px-1 text-xs text-texto-tenue">Sugerencias</span>
              {SUGERENCIAS.map((sugerencia) => (
                <button
                  key={sugerencia.etiqueta}
                  type="button"
                  onClick={() => alCambiar({ instruccion: sugerencia.texto })}
                  className="flex cursor-pointer items-center gap-1 rounded-full bg-acento-tenue py-1 pr-3 pl-2 text-xs font-medium text-texto transition-colors hover:bg-acento hover:text-acento-contraste"
                >
                  <span aria-hidden="true" className="material-symbols-rounded icono-contorno text-sm">
                    add
                  </span>
                  {sugerencia.etiqueta}
                </button>
              ))}
            </div>
          ) : null}

          <SelectorDeOpciones
            completo
            rotulo="Tipo de texto"
            icono="edit_note"
            etiquetaAccesible="Tipo de texto"
            opciones={MODOS}
            valor={modo}
            alCambiar={(valor) => alCambiar({ modo: valor })}
          />

          {/* Extensión y formato no aplican a una cita: mide lo que mide, y en viñetas se desfiguraría. */}
          {modo === 'cita' ? null : (
            <>
              <SelectorDeOpciones
                completo
                rotulo="Extensión"
                icono="straighten"
                etiquetaAccesible="Extensión"
                opciones={EXTENSIONES}
                valor={marcador.extension ?? 'media'}
                alCambiar={(valor) => alCambiar({ extension: valor })}
              />
              <SelectorDeOpciones
                completo
                rotulo="Presentación"
                icono="format_list_bulleted"
                etiquetaAccesible="Presentación"
                opciones={FORMATOS}
                valor={marcador.formato}
                alCambiar={(formato) => alCambiar({ formato })}
              />
            </>
          )}

          <SelectorDeOpciones
            completo
            rotulo="Si falta material"
            icono="report"
            etiquetaAccesible="Si falta material"
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
/*
  El tono de toda la plantilla, arriba de los campos: vale para todos ellos, y
  es lo primero que se decide sobre cómo va a sonar la memoria. Desplegable y
  no una fila de pastillas: son seis opciones y el panel ya está lleno. Con
  "Personalizado", un campo para escribir la instrucción; se guarda al salir
  de él, no con cada letra.
*/
function SelectorDeTono({
  tono,
  alCambiar,
}: {
  tono: TonoDePlantilla
  alCambiar: (tono: TonoDePlantilla) => void
}): ReactElement {
  const [propio, setPropio] = useState(tono.propio)
  const elegido = PRESETS_DE_TONO.find((preset) => preset.valor === tono.preset)

  return (
    <div className="flex flex-col gap-2 rounded-[20px] bg-fondo p-3">
      <SelectorDeOpciones
        completo
        rotulo="Tono de la redacción"
        icono="record_voice_over"
        etiquetaAccesible="Tono de la redacción"
        valor={tono.preset}
        opciones={PRESETS_DE_TONO.map((preset) => ({
          valor: preset.valor,
          etiqueta: preset.etiqueta,
          icono: preset.icono,
        }))}
        alCambiar={(preset) => alCambiar({ preset, propio })}
      />

      {tono.preset === 'personalizado' ? (
        <textarea
          value={propio}
          onChange={(cambio) => setPropio(cambio.target.value)}
          onBlur={() => alCambiar({ preset: 'personalizado', propio })}
          rows={3}
          placeholder="Ej.: cercano pero profesional, en primera persona del plural, sin tecnicismos."
          aria-label="Instrucción de tono"
          className={`${CAMPO} resize-none py-3 text-sm leading-relaxed`}
        />
      ) : (
        <p className="px-2 text-sm leading-relaxed text-texto-tenue">{elegido?.instruccion}</p>
      )}
    </div>
  )
}

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
