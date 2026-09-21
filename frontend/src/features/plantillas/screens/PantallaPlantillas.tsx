import type { ChangeEvent, ReactElement } from 'react'
import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { mensajeDeError } from '@/shared/errors'
import { BotonPildora, Esqueleto, PanelDeError } from '@/shared/ui'
import { MiniaturaDeDocx } from '../components'
import type { Plantilla } from '../data'
import { importarDocx } from '../editor/importarDocx'
import { useDocxDePlantilla } from '../useDocxDePlantilla'
import { usePlantillas } from '../usePlantillas'

/*
  Plantillas: una galería de hojas, no un explorador.

  Conferencias es un archivo que se recorre por niveles —evento, charla,
  ficha— y por eso vive en columnas. Una plantilla no se recorre: se
  reconoce de un vistazo por cómo se ve, igual que se reconoce un documento en
  una carpeta por su primera página. Por eso aquí cada plantilla es su hoja en
  miniatura, y copiar las columnas de Conferencias habría dado una pantalla
  repetida para algo que se usa de otra manera.

  Solo se suben `.docx`. La plantilla en blanco —el editor dentro de la app—
  salió del camino por decisión del usuario: el diseño se hace en Word, donde
  ya se sabe hacer, y aquí solo se dice qué debe escribir la IA en cada hueco.
  Su código sigue en el repositorio hasta el paso de limpieza del plan (ver
  `CLAUDE.md`, sección 8); desde aquí ya no se puede crear una.
*/

/*
  El estado vacío enseña el método, no invita a "crear".

  Lo único que hay que aprender es la convención de los corchetes, y es
  justo lo que no se adivina: sin decirlo, alguien subiría su plantilla sin
  marcar nada y se encontraría con "no hay marcadores" sin saber por qué. El
  segundo paso muestra el marcador escrito tal cual, para que se copie.
*/
const PASOS = [
  {
    icono: 'edit_document',
    titulo: 'Diseña en Word',
    texto: 'Logos, títulos, fuentes y colores. La hoja queda exactamente como la hagas: aquí no se toca.',
  },
  {
    icono: 'data_object',
    titulo: 'Marca los huecos',
    marcador: '[[Resumen de la tesis]]',
    texto: 'Escríbelo donde va el contenido. El texto que llegue heredará su fuente, tamaño y color.',
  },
  {
    icono: 'auto_awesome',
    titulo: 'Dile a la IA qué va',
    texto: 'Una instrucción por marcador. Se escribe una vez y sirve para todas las memorias.',
  },
] as const

export function PantallaPlantillas(): ReactElement {
  const { plantillas, cargando, codigoDeError, crearDesdeDocx } = usePlantillas({
    podarAbandonadas: true,
  })
  const navigate = useNavigate()
  const refInput = useRef<HTMLInputElement>(null)
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

    /* Recién subida, lo siguiente es decir qué va en cada hueco: se entra directo a configurarla. */
    void navigate(`/plantillas/${creada.plantilla.id}`)
  }

  const botonDeSubida = (
    <BotonPildora
      variante="primario"
      icono="upload"
      disabled={subiendo}
      onClick={() => refInput.current?.click()}
    >
      {subiendo ? 'Subiendo…' : 'Subir plantilla'}
    </BotonPildora>
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        {/*
          Una línea que diga para qué es la sección, siempre. Con la galería
          llena no queda nada más en pantalla que lo explique, y quien vuelve
          una semana después ve hojas sin saber qué se hace con ellas.
        */}
        <div className="flex flex-col gap-2">
          <h1 className="font-titulo text-[32px] leading-none font-semibold text-texto">Plantillas</h1>
          <p className="text-base text-texto-tenue">
            Tus diseños de Word, con lo que debe escribir la IA en cada hueco.
          </p>
        </div>

        {/* Arriba solo cuando ya hay alguna: vacía, el botón vive dentro de la explicación, que es donde se lee. */}
        {plantillas.length === 0 ? null : botonDeSubida}

        <input
          ref={refInput}
          type="file"
          accept=".docx"
          aria-label="Plantilla de Word"
          onChange={(evento) => void alElegirDocx(evento)}
          className="hidden"
        />
      </div>

      {error === null ? null : (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      )}

      {cargando ? (
        <Esqueleto filas={3} etiqueta="Cargando las plantillas" />
      ) : codigoDeError !== null ? (
        <PanelDeError mensaje={mensajeDeError(codigoDeError)} />
      ) : plantillas.length === 0 ? (
        <section className="flex flex-1 flex-col items-center justify-center gap-8 rounded-[24px] bg-panel px-6 py-12">
          <h2 className="text-center font-titulo text-[26px] leading-tight font-semibold text-texto">
            Tu primera plantilla empieza en Word
          </h2>

          <ol className="grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
            {PASOS.map((paso, indice) => (
              <li key={paso.titulo} className="flex flex-col gap-3 rounded-[20px] bg-fondo p-5">
                <span
                  aria-hidden="true"
                  className="flex size-10 items-center justify-center rounded-full bg-ilustracion text-ilustracion-texto"
                >
                  <span className="material-symbols-rounded icono-relleno text-xl">{paso.icono}</span>
                </span>

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
              </li>
            ))}
          </ol>

          {botonDeSubida}
        </section>
      ) : (
        <ul
          aria-label="Plantillas"
          className="grid grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] gap-4"
        >
          {plantillas.map((plantilla) => (
            <li key={plantilla.id}>
              <HojaDePlantilla plantilla={plantilla} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/*
  Una plantilla en la galería: su primera página, su nombre y cuánto le falta.

  "Cuánto le falta" es lo que decide si ya sirve para generar memorias: un
  marcador sin instrucción es un hueco que la IA no sabría llenar. Decirlo en
  la tarjeta evita tener que entrar a cada una para averiguarlo.
*/
function HojaDePlantilla({ plantilla }: { plantilla: Plantilla }): ReactElement {
  const esDocx = plantilla.origen === 'docx'
  const { archivo } = useDocxDePlantilla(esDocx ? plantilla.rutaArchivoOriginal : null)

  const huecos = esDocx ? plantilla.marcadores.filter((marcador) => marcador.tipo === 'simple') : []
  const listos = huecos.filter((marcador) => (marcador.instruccion ?? '').trim() !== '').length
  const pendientes = huecos.length - listos

  const estado =
    !esDocx
      ? 'Plantilla en blanco'
      : huecos.length === 0
        ? 'Sin marcadores'
        : pendientes === 0
          ? `${huecos.length} ${huecos.length === 1 ? 'hueco listo' : 'huecos listos'}`
          : `${pendientes} de ${huecos.length} sin instrucción`

  return (
    <Link
      to={`/plantillas/${plantilla.id}`}
      className="group flex flex-col gap-3 rounded-[24px] bg-panel p-3 transition-colors hover:bg-acento-tenue"
    >
      {/*
        La hoja va sobre `papel`, que no cambia con el tema: un documento de
        Word es blanco aunque la app esté en oscuro, y verlo así es lo que
        permite reconocerlo.
      */}
      <div className="relative h-56 overflow-hidden rounded-2xl bg-papel shadow-[inset_0_0_0_1px_var(--bitacora-filete)]">
        {esDocx ? (
          <MiniaturaDeDocx archivo={archivo} />
        ) : (
          <span
            aria-hidden="true"
            className="material-symbols-rounded icono-contorno absolute inset-0 m-auto size-fit text-5xl [color:var(--bitacora-papel-texto)] opacity-30"
          >
            description
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1 px-2 pb-1">
        <p className="truncate font-titulo text-lg leading-snug font-semibold text-texto">{plantilla.nombre}</p>

        <p className="flex items-center gap-1.5 text-sm text-texto-tenue">
          {/* El punto dice de un vistazo si ya sirve, antes de leer el texto. */}
          {esDocx && huecos.length > 0 ? (
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
