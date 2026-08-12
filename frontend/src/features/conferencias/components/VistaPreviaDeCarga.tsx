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

function Fila({ rotulo, valor, tenue = false }: { rotulo: string; valor: string; tenue?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-texto-tenue">{rotulo}</span>
      <span className={tenue ? 'text-sm text-texto-tenue' : 'text-sm text-texto'}>{valor}</span>
    </div>
  )
}

export function VistaPreviaDeCarga({ datos, archivo, eventos, ponentes }: PropiedadesVistaPrevia) {
  const nombreDelEvento = eventos.find((evento) => evento.id === datos.idEvento)?.nombre ?? null
  const nombreDelPonente = ponentes.find((ponente) => ponente.id === datos.idPonente)?.nombre ?? null

  return (
    <aside aria-label="Vista previa" className="flex h-fit flex-col gap-4 rounded-md bg-panel p-4 shadow-sm">
      <h2 className="text-sm font-medium text-texto">Vista previa</h2>

      {datos.titulo.trim() === '' ? (
        <p className="text-sm text-texto-tenue">Título de la charla</p>
      ) : (
        <p className="text-sm font-medium text-texto">{datos.titulo}</p>
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
