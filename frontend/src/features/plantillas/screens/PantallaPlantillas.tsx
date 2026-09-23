import type { ChangeEvent, ReactElement, RefObject } from 'react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { PARAMETRO_DE_CREACION } from '@/app/layout/navegacion'
import { mensajeDeError } from '@/shared/errors'
import { BotonPildora, Esqueleto, Modal, PanelDeError, recordarOrigenDeApertura, useAterrizarDesdeCierre } from '@/shared/ui'
import { MiniaturaDeDocx } from '../components'
import type { Plantilla } from '../data'
import { importarDocx } from '../editor/importarDocx'
import { useDocxDePlantilla } from '../useDocxDePlantilla'
import { cuantasHabia } from '../listaRecordada'
import { usePlantillas } from '../usePlantillas'

/*
  Plantillas: una galería de hojas, no un explorador.

  Conferencias es un archivo que se recorre por niveles —evento, charla,
  ficha— y por eso vive en columnas. Una plantilla no se recorre: se
  reconoce de un vistazo por cómo se ve, igual que se reconoce un documento en
  una carpeta por su primera página. Por eso aquí cada plantilla es su hoja en
  miniatura, y copiar las columnas de Conferencias habría dado una pantalla
  repetida para algo que se usa de otra manera.

  Solo se suben `.docx`: el diseño se hace en Word, donde ya se sabe hacer, y
  aquí solo se dice qué debe escribir la IA en cada campo.
*/

/*
  El método en tres pasos. Se enseña en dos sitios —el estado vacío y el
  botón de ayuda— porque lo único que hay que aprender es la convención de los
  corchetes, y es justo lo que no se adivina: sin decirlo, alguien subiría su
  plantilla sin marcar nada y no sabría por qué no se aceptó.
*/
const PASOS = [
  {
    icono: 'edit_document',
    titulo: 'Diseña en Word',
    texto: 'Logos, títulos, fuentes y colores. La hoja queda exactamente como la hagas: aquí no se toca.',
  },
  {
    icono: 'data_object',
    titulo: 'Marca los campos',
    marcador: '[[Resumen de la tesis]]',
    texto: 'Escríbelo donde va el contenido. Lo que llegue ahí heredará su fuente, tamaño y color.',
  },
  {
    icono: 'auto_awesome',
    titulo: 'Dile a la IA qué va',
    texto: 'Una instrucción por campo. Se escribe una vez y sirve para todas las memorias.',
  },
] as const

function PasosDelMetodo({ apilados = false }: { apilados?: boolean }): ReactElement {
  return (
    <ol className={`grid w-full grid-cols-1 gap-3 ${apilados ? '' : 'max-w-3xl sm:grid-cols-3'}`}>
      {PASOS.map((paso, indice) => (
        <li key={paso.titulo} className={`flex gap-3 rounded-[20px] bg-fondo p-5 ${apilados ? 'flex-row' : 'flex-col'}`}>
          <span
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ilustracion text-ilustracion-texto"
          >
            <span className="material-symbols-rounded icono-relleno text-xl">{paso.icono}</span>
          </span>

          <div className="flex min-w-0 flex-col gap-2">
            <p className="text-base font-medium text-texto">
              <span className="text-texto-tenue">{indice + 1}. </span>
              {paso.titulo}
            </p>

            {/* Sin partir: es lo que hay que copiar tal cual, y cortado por la mitad deja de leerse como una sola cosa. */}
            {'marcador' in paso ? (
              <code className="w-fit rounded-lg bg-acento-tenue px-2 py-1 font-mono text-[13px] whitespace-nowrap text-texto">
                {paso.marcador}
              </code>
            ) : null}

            <p className="text-sm leading-relaxed text-texto-tenue">{paso.texto}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}

export function PantallaPlantillas(): ReactElement {
  const { plantillas, cargando, codigoDeError, crearDesdeDocx } = usePlantillas()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const refInput = useRef<HTMLInputElement>(null)
  const botonDeAyuda = useRef<HTMLButtonElement>(null)
  const botonDeSubida = useRef<HTMLSpanElement>(null)
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ayudaAbierta, setAyudaAbierta] = useState(false)
  /* De dónde crece el modal: del "?" o, si lo pidió el dock, del botón de subir. */
  const [anclaDeLaAyuda, setAnclaDeLaAyuda] = useState<RefObject<HTMLElement | null>>(botonDeAyuda)

  /*
    "Cargar plantilla" vive en el dock y llega como `?nuevo=1`. Abre la
    explicación con su botón de subir, no el selector de archivos directo: el
    navegador solo deja abrirlo como respuesta a un clic, y tras una
    navegación ese permiso puede haber caducado. Así funciona siempre, y quien
    llega por primera vez ve cómo se marcan los campos antes de elegir.
  */
  useEffect(() => {
    if (params.get(PARAMETRO_DE_CREACION) === null) {
      return
    }

    setAnclaDeLaAyuda(botonDeSubida)
    setAyudaAbierta(true)

    const siguiente = new URLSearchParams(params)
    siguiente.delete(PARAMETRO_DE_CREACION)
    setParams(siguiente, { replace: true })
  }, [params, setParams])

  async function alElegirDocx(evento: ChangeEvent<HTMLInputElement>): Promise<void> {
    const archivo = evento.target.files?.[0] ?? null
    evento.target.value = ''

    if (archivo === null) {
      return
    }

    setSubiendo(true)
    setError(null)

    const resultado = await importarDocx(archivo)

    if (!resultado.ok) {
      setSubiendo(false)
      setError(mensajeDeError(resultado.codigo))
      return
    }

    /*
      Sin campos no se sube. Una plantilla sin nada que rellenar no puede
      generar ninguna memoria, y aceptarla para después decir "no encontramos
      marcadores" dentro de ella es dejar pasar un archivo que ya se sabía
      inservible — y, peor, dejarlo en la galería.
    */
    if (resultado.marcadores.length === 0) {
      setSubiendo(false)
      setError(mensajeDeError('PLANT_DOCX_SIN_CAMPOS'))
      return
    }

    /*
      El indicador sigue encendido durante la subida al bucket y el insert:
      es la parte lenta, y apagarlo al terminar de leer el archivo dejaría
      varios segundos de pantalla quieta después de elegir un `.docx` grande.
    */
    const nombre = archivo.name.replace(/\.docx$/i, '').trim()
    const creada = await crearDesdeDocx(archivo, nombre.length > 0 ? nombre : 'Plantilla sin nombre', resultado.marcadores)
    setSubiendo(false)

    if (!creada.ok) {
      setError(mensajeDeError(creada.codigo))
      return
    }

    setAyudaAbierta(false)
    /* Recién subida, lo siguiente es decir qué va en cada campo: se entra directo a configurarla. */
    recordarOrigenDeApertura(botonDeSubida.current)
    void navigate(`/plantillas/${creada.plantilla.id}`)
  }

  const elegirArchivo = (): void => refInput.current?.click()

  const boton = (
    <BotonPildora variante="primario" icono="upload" disabled={subiendo} onClick={elegirArchivo}>
      {subiendo ? 'Subiendo…' : 'Subir plantilla'}
    </BotonPildora>
  )

  const avisoDeError =
    error === null ? null : (
      <p role="alert" className="text-sm leading-relaxed text-error">
        {error}
      </p>
    )

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/*
          Solo el título, como en Memorias y en la referencia. La línea que
          explicaba la sección la quitó el usuario: se lee una vez y después
          solo empuja el contenido. Para quien no sabe qué se hace aquí está
          el botón "?", con el método entero.
        */}
        <h1 className="font-titulo text-[32px] leading-none font-semibold text-texto">Plantillas</h1>

        <div className="flex items-center gap-2">
          {/*
            La explicación vuelve a estar a mano. Vacía, la galería la enseña
            entera; en cuanto había una plantilla desaparecía, y con ella la
            única descripción de cómo se marcan los campos.
          */}
          {plantillas.length === 0 ? null : (
            <button
              ref={botonDeAyuda}
              type="button"
              aria-label="Cómo se hace una plantilla"
              onClick={() => {
                setAnclaDeLaAyuda(botonDeAyuda)
                setAyudaAbierta(true)
              }}
              className="flex size-10 cursor-pointer items-center justify-center rounded-full bg-acento-tenue text-texto-tenue transition-colors hover:text-texto"
            >
              <span aria-hidden="true" className="material-symbols-rounded icono-contorno text-xl">
                help
              </span>
            </button>
          )}

          {/* Arriba solo cuando ya hay alguna: vacía, el botón vive dentro de la explicación, que es donde se lee. */}
          <span ref={botonDeSubida} className="inline-flex">
            {plantillas.length === 0 ? null : boton}
          </span>
        </div>

        <input
          ref={refInput}
          type="file"
          accept=".docx"
          aria-label="Plantilla de Word"
          onChange={(evento) => void alElegirDocx(evento)}
          className="hidden"
        />
      </div>

      {ayudaAbierta ? null : avisoDeError}

      {cargando ? (
        /*
          Tantas hojas como había la última vez, no un número fijo: tres
          marcos para una sola plantilla prometen algo que no llega, y la
          rejilla se encoge de golpe al cargar.
        */
        <Esqueleto filas={Math.max(1, cuantasHabia() ?? 1)} etiqueta="Cargando las plantillas" variante="galeria" />
      ) : codigoDeError !== null ? (
        <PanelDeError mensaje={mensajeDeError(codigoDeError)} />
      ) : plantillas.length === 0 ? (
        <section className="flex flex-1 flex-col items-center justify-center gap-8 rounded-[24px] bg-panel px-6 py-12">
          <h2 className="text-center font-titulo text-[26px] leading-tight font-semibold text-texto">
            Tu primera plantilla empieza en Word
          </h2>

          <PasosDelMetodo />

          {boton}
        </section>
      ) : (
        <ul aria-label="Plantillas" className="grid grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] gap-4">
          {plantillas.map((plantilla) => (
            <li key={plantilla.id}>
              <HojaDePlantilla plantilla={plantilla} />
            </li>
          ))}
        </ul>
      )}

      <Modal
        abierto={ayudaAbierta}
        alCerrar={() => setAyudaAbierta(false)}
        titulo="Cómo se hace una plantilla"
        ancho="angosto"
        anclaje="disparador"
        anclaEn={anclaDeLaAyuda}
      >
        <PasosDelMetodo apilados />
        {avisoDeError}
        <BotonPildora variante="primario" icono="upload" disabled={subiendo} onClick={elegirArchivo}>
          {subiendo ? 'Subiendo…' : 'Elegir el archivo de Word'}
        </BotonPildora>
      </Modal>
    </div>
  )
}

/*
  Una plantilla en la galería: su primera página, su nombre y cuánto le falta.

  "Cuánto le falta" es lo que decide si ya sirve para generar memorias: un
  campo sin instrucción es uno que la IA solo podría adivinar por su nombre.
  Decirlo en la tarjeta evita tener que entrar a cada una para averiguarlo.

  Al pulsarla anota su caja: la pantalla de la plantilla crece desde aquí,
  igual que un modal crece desde su botón, y al volver se encoge de nuevo en
  ella (`shared/ui/crecerDesde.ts`).
*/
function HojaDePlantilla({ plantilla }: { plantilla: Plantilla }): ReactElement {
  const tarjeta = useRef<HTMLAnchorElement>(null)
  useAterrizarDesdeCierre(tarjeta, plantilla.id)
  const { archivo, codigoDeError } = useDocxDePlantilla(plantilla.rutaArchivoOriginal)

  const campos = plantilla.marcadores.filter((marcador) => marcador.tipo === 'simple')
  const listos = campos.filter((marcador) => (marcador.instruccion ?? '').trim() !== '').length
  const pendientes = campos.length - listos

  const estado =
    campos.length === 0
      ? 'Sin campos'
      : pendientes === 0
        ? `${campos.length} ${campos.length === 1 ? 'campo listo' : 'campos listos'}`
        : `${pendientes} de ${campos.length} sin instrucción`

  return (
    <Link
      ref={tarjeta}
      to={`/plantillas/${plantilla.id}`}
      onClick={(evento) => recordarOrigenDeApertura(evento.currentTarget)}
      className="group flex flex-col gap-3 rounded-[24px] bg-panel p-3 transition-colors hover:bg-acento-tenue"
    >
      {/*
        La hoja va sobre `papel`, que no cambia con el tema: un documento de
        Word es blanco aunque la app esté en oscuro, y verlo así es lo que
        permite reconocerlo.
      */}
      {/* Con la forma de una hoja carta: la miniatura la enseña entera, no recortada. */}
      <div className="relative aspect-[17/22] overflow-hidden rounded-2xl bg-papel shadow-[inset_0_0_0_1px_var(--bitacora-filete)]"
      >
        <MiniaturaDeDocx archivo={archivo} fallida={codigoDeError !== null} />
      </div>

      <div className="flex flex-col gap-1 px-2 pb-1">
        <p className="truncate font-titulo text-lg leading-snug font-semibold text-texto">{plantilla.nombre}</p>

        <p className="flex items-center gap-1.5 text-sm text-texto-tenue">
          {/* El punto dice de un vistazo si ya sirve, antes de leer el texto. */}
          {campos.length > 0 ? (
            <span
              aria-hidden="true"
              className={`size-1.5 shrink-0 rounded-full ${pendientes === 0 ? 'bg-texto' : 'bg-texto-tenue/40'}`}
            />
          ) : null}
          {estado}
        </p>
      </div>
    </Link>
  )
}
