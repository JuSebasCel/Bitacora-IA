import { formatearFecha } from '../data'
import type { Evento, FuenteDeConferencia, Ponente } from '../data'
import type { DatosDeCarga } from '../carga'

/*
  Columna de vista previa junto al formulario de carga (F3).

  No es decorativo: repite en tiempo real lo que se va a cargar, con los ids
  de evento y ponente ya resueltos a su nombre. Llena el espacio que quedaba
  vacío en escritorio (el formulario, solo, es una tarjeta angosta flotando en
  un viewport ancho) y reduce la incertidumbre de "qué va a pasar" antes de
  enviar.
*/

type PropiedadesVistaPrevia = {
  datos: DatosDeCarga
  archivo: File | null
  eventos: readonly Evento[]
  ponentes: readonly Ponente[]
}

const TEXTO_POR_FUENTE: Record<FuenteDeConferencia, string> = {
  audio: 'Audio',
  transcripcion: 'Transcripción',
}

function formatearTamano(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/*
  `break-words` + `min-w-0`: el nombre de un archivo real puede no traer un
  solo espacio (`grabacion_del_20260911_conferencia_completa_final_v2.mp3`),
  y sin las dos cosas juntas un token así de largo no tiene dónde partirse:
  empuja el ancho de esta columna del formulario más allá del viewport en vez
  de ajustarse a él. `min-w-0` es el que de verdad importa -- por defecto un
  hijo de grid/flex no se encoge más allá de su contenido, así que sin él
  `break-words` no tiene margen para actuar.
*/
function Fila({ rotulo, valor, tenue = false }: { rotulo: string; valor: string; tenue?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-xs text-texto-tenue">{rotulo}</span>
      <span
        className={
          tenue
            ? 'min-w-0 text-sm break-words text-texto-tenue'
            : 'min-w-0 text-sm break-words text-texto'
        }
      >
        {valor}
      </span>
    </div>
  )
}

export function VistaPreviaDeCarga({ datos, archivo, eventos, ponentes }: PropiedadesVistaPrevia) {
  const nombreDelEvento = eventos.find((evento) => evento.id === datos.idEvento)?.nombre ?? null
  const nombreDelPonente = ponentes.find((ponente) => ponente.id === datos.idPonente)?.nombre ?? null

  return (
    <aside
      aria-label="Vista previa"
      className="flex h-fit min-w-0 flex-col gap-4 rounded-md bg-panel p-4 shadow-sm"
    >
      <h2 className="text-sm font-medium text-texto">Vista previa</h2>

      {datos.titulo.trim() === '' ? (
        <p className="min-w-0 text-sm text-texto-tenue">Título de la conferencia</p>
      ) : (
        <p className="min-w-0 text-sm font-medium break-words text-texto">{datos.titulo}</p>
      )}

      <div className="flex flex-col gap-3 rounded-md bg-fondo p-4">
        <Fila rotulo="Evento" valor={nombreDelEvento ?? 'Sin elegir'} tenue={nombreDelEvento === null} />
        <Fila
          rotulo="Ponente"
          valor={nombreDelPonente ?? 'Sin elegir'}
          tenue={nombreDelPonente === null}
        />
        <Fila
          rotulo="Fecha"
          valor={datos.fechaDelEvento.trim() === '' ? 'Sin elegir' : formatearFecha(datos.fechaDelEvento)}
          tenue={datos.fechaDelEvento.trim() === ''}
        />
      </div>

      <div className="flex flex-col gap-3 rounded-md bg-fondo p-4">
        <Fila rotulo="Fuente" valor={TEXTO_POR_FUENTE[datos.fuente]} />
        <Fila
          rotulo="Archivo"
          valor={archivo === null ? 'Sin elegir' : `${archivo.name} · ${formatearTamano(archivo.size)}`}
          tenue={archivo === null}
        />
      </div>
    </aside>
  )
}
