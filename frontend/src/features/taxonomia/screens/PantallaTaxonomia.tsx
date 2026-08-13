import type { ReactElement } from 'react'
import { useMemo, useState } from 'react'
import { CONFERENCIAS_DE_EJEMPLO, FICHAS_DE_EJEMPLO } from '@/features/conferencias/data'
import { useDirectorio } from '@/features/conferencias/directorio'
import { normalizarTexto } from '@/features/conferencias/query'
import { DialogoDeCreacion, EncabezadoDeSeccion, EstadoVacio } from '@/shared/ui'
import { ColaDePropuestas, ListaDeTemas } from '../components'
import type { UsoDeTema } from '../components'
import { temasActivosDe } from '../taxonomia'
import { useTaxonomia } from '../useTaxonomia'
import type { ResultadoDeAccion } from '../useTaxonomia'

/*
  Administración de la taxonomía de temas (F9), `PLAN.md` sección 3.1.

  Jerarquía visual: esto no es un listado, es una consola de configuración, y
  por eso no se parece ni a Conferencias (filas densas de un inventario que se
  recorre) ni al Catálogo (mosaico de citas de largo desigual que se lee). Lo
  que ordena la pantalla es la dependencia entre las tres cosas que administra:

  1. El pool general manda, porque las otras dos dependen de él, y ocupa la
     columna ancha de la izquierda.
  2. Los temas activos por evento no son un bloque aparte sino una lente sobre
     ese mismo pool: un tema activo no es otra entidad, es el mismo tema visto
     desde un evento. Por eso vive dentro del panel del pool, como columna de
     casillas gobernada por un selector de evento, y no como una segunda lista
     que repetiría los mismos once nombres a media pantalla de distancia.
  3. La cola de propuestas es lo único que no está todavía en el pool y lo
     único con trabajo pendiente de una persona, así que se queda en su propia
     columna, angosta, con el conteo de lo que espera revisión a la vista.

  En pantallas angostas las dos columnas se apilan, con el pool primero: la
  cola lleva su conteo en el encabezado, así que sigue anunciando que hay
  trabajo sin tener que adelantarse al objeto que administra la pantalla.
*/

const DESCRIPCION =
  'Administra el vocabulario con el que se clasifican las fichas: el pool general que comparten los eventos, qué temas se ofrecen en cada uno, y las propuestas que el procesamiento dejó esperando revisión.'

/*
  El uso se cuenta sobre todas las fichas y conferencias del sistema, no solo
  sobre las que ve quien mira: un tema que usa la conferencia de otra persona
  sigue estando en uso, y eliminarlo le rompería la clasificación a ella.
*/
function contarUso(): ReadonlyMap<string, UsoDeTema> {
  const conteos = new Map<string, UsoDeTema>()

  function sumar(idTema: string, esFicha: boolean): void {
    const actual = conteos.get(idTema) ?? { fichas: 0, conferencias: 0 }

    conteos.set(idTema, {
      fichas: actual.fichas + (esFicha ? 1 : 0),
      conferencias: actual.conferencias + (esFicha ? 0 : 1),
    })
  }

  for (const ficha of FICHAS_DE_EJEMPLO) {
    sumar(ficha.idTema, true)
  }

  for (const conferencia of CONFERENCIAS_DE_EJEMPLO) {
    sumar(conferencia.idTemaPrincipal, false)
  }

  return conteos
}

export function PantallaTaxonomia(): ReactElement {
  const { taxonomia, crear, renombrar, eliminar, activar, desactivar, aprobar, rechazar } =
    useTaxonomia()
  const { eventos } = useDirectorio()

  const [idEvento, setIdEvento] = useState<string | null>(() => eventos[0]?.id ?? null)
  const [dialogoAbierto, setDialogoAbierto] = useState(false)

  /*
    No hay estado de carga y no es un olvido: la taxonomía y el directorio se
    leen del almacenamiento del navegador de forma síncrona, así que nunca hay
    un momento en que la pantalla exista sin sus datos. Cuando B4 traiga la
    taxonomía real por red, aquí entra el esqueleto, como en el catálogo.
  */
  const usoPorTema = useMemo(contarUso, [])
  const idsTemasEnUso = useMemo(() => [...usoPorTema.keys()], [usoPorTema])

  /* Alfabético: el pool se consulta buscando un nombre, no por orden de creación. */
  const temasOrdenados = useMemo(
    () => taxonomia.temas.toSorted((izquierda, derecha) => izquierda.nombre.localeCompare(derecha.nombre)),
    [taxonomia.temas],
  )

  const idsActivos = useMemo(
    () =>
      new Set(
        idEvento === null ? [] : temasActivosDe(taxonomia, idEvento).map((tema) => tema.id),
      ),
    [taxonomia, idEvento],
  )

  function nombreDeEvento(id: string): string {
    return eventos.find((evento) => evento.id === id)?.nombre ?? 'Evento retirado'
  }

  /*
    Mismo criterio de comparación que `crearTema` (normalizado, sin tildes ni
    mayúsculas), para que el aviso previo diga exactamente lo mismo que dirá la
    aprobación al fallar. Si los dos criterios se separaran, la pantalla
    avisaría de un choque que el dominio no ve, o al revés.
  */
  function temaQueChoca(nombre: string): string | null {
    const comparable = normalizarTexto(nombre)

    return taxonomia.temas.find((tema) => normalizarTexto(tema.nombre) === comparable)?.nombre ?? null
  }

  /*
    Los temas activos del evento que originó cada propuesta. Se resuelve aquí
    y no dentro de la cola para que la cola siga sin conocer la forma de la
    taxonomía: solo recibe nombres ya resueltos.
  */
  function temasActivosDelEvento(idEventoDeLaPropuesta: string): readonly string[] {
    return temasActivosDe(taxonomia, idEventoDeLaPropuesta).map((tema) => tema.nombre)
  }

  function alAlternar(idTema: string, activarlo: boolean): ResultadoDeAccion {
    if (idEvento === null) {
      /* Sin evento elegido no se dibuja ninguna casilla, así que no es alcanzable. */
      return { ok: true }
    }

    return activarlo ? activar(idEvento, idTema) : desactivar(idEvento, idTema)
  }

  return (
    <>
      <EncabezadoDeSeccion titulo="Taxonomía" descripcion={DESCRIPCION} />

      <div className="mt-6 flex flex-col gap-6">
        {/*
          El directorio siempre trae los eventos semilla, así que quedarse sin
          ninguno solo pasaría con un almacenamiento manipulado; aun así la
          pantalla lo dice en vez de mostrar un selector vacío sin explicación.
        */}
        {eventos.length === 0 ? (
          <EstadoVacio
            titulo="No hay eventos donde activar temas"
            descripcion="La taxonomía se define por evento, así que primero hace falta al menos uno. Crea el evento al cargar su primera conferencia y vuelve aquí a elegir qué temas se ofrecen en él."
          />
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:items-start">
          <ListaDeTemas
            temas={temasOrdenados}
            eventos={eventos}
            idEvento={idEvento}
            idsActivos={idsActivos}
            usoPorTema={usoPorTema}
            alElegirEvento={setIdEvento}
            alAlternar={alAlternar}
            alRenombrar={renombrar}
            alEliminar={(idTema) => eliminar(idTema, idsTemasEnUso)}
            alPedirTemaNuevo={() => setDialogoAbierto(true)}
          />

          <ColaDePropuestas
            propuestas={taxonomia.propuestas}
            nombreDeEvento={nombreDeEvento}
            temaQueChoca={temaQueChoca}
            temasActivosDelEvento={temasActivosDelEvento}
            alAprobar={aprobar}
            alRechazar={rechazar}
          />
        </div>
      </div>

      <DialogoDeCreacion
        abierto={dialogoAbierto}
        titulo="Nuevo tema"
        etiquetaCampo="Nombre del tema"
        placeholder="Gobernanza de datos"
        alCerrar={() => setDialogoAbierto(false)}
        alCrear={crear}
      />
    </>
  )
}
