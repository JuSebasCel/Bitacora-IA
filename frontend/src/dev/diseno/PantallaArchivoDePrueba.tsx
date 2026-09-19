import { useMemo, useState } from 'react'
import type { ReactElement } from 'react'
import {
  CONFERENCIAS_DE_EJEMPLO,
  ESPACIOS_DE_ETIQUETAS_DE_EJEMPLO,
  FICHAS_DE_EJEMPLO,
} from '@/features/conferencias/data'
import type { AsignacionDeEtiqueta, Etiqueta } from '@/features/conferencias/data'
import { CRITERIOS_POR_DEFECTO, listarConferencias } from '@/features/conferencias/query'
import type { ConferenciaVisible, CriteriosDeListado } from '@/features/conferencias/query'
import { PantallaArchivo } from '@/features/conferencias/screens/PantallaArchivo'
import type { EtiquetaVisible } from '@/features/conferencias/tags'
import { TEMAS_DE_EJEMPLO } from '@/features/taxonomia/data'

/*
  Vista previa del archivo con los fixtures de la serie F, en `/_archivo`.

  Existe porque la cuenta real está vacía y la pantalla no se puede juzgar sin
  contenido: con cero conferencias solo se ve el esqueleto, y las filas de
  evento, la lista de fichas y el detalle —que es donde está casi todo el
  diseño— quedaban sin mirar.

  Usa los fixtures del propio proyecto y no datos inventados, así que lo que
  se ve aquí es coherente con lo que el sistema ya propone: las mismas
  charlas, los mismos temas y las mismas fichas con las que se escribieron
  las pruebas.

  Los filtros y las etiquetas funcionan de verdad, contra el mismo
  `listarConferencias` que usa la pantalla real; lo único simulado es el
  guardado, que aquí es estado de React en vez de Supabase. Los criterios no
  van a la URL a propósito: esto es una maqueta y no debe ensuciar la barra
  de direcciones.

  Para que se vea el caso interesante, una parte de las conferencias entra
  como compartida: así la procedencia filtra algo y las etiquetas ajenas se
  distinguen de las propias.
*/

const ID_DE_PRUEBA = 'ad474b7c-4a6e-4092-8c7e-ccf8701d9178'
const ESPACIO_DE_PRUEBA = ESPACIOS_DE_ETIQUETAS_DE_EJEMPLO[ID_DE_PRUEBA]

const VISIBLES: readonly ConferenciaVisible[] = CONFERENCIAS_DE_EJEMPLO.map((conferencia, indice) => ({
  conferencia,
  /* Una de cada tres llega compartida, para que "Propias" y "Compartidas" no den lo mismo. */
  procedencia: indice % 3 === 2 ? 'compartida' : 'propia',
  comparticion: null,
}))

export function PantallaArchivoDePrueba(): ReactElement {
  const [validadas, setValidadas] = useState<readonly string[]>([])
  const [criterios, setCriterios] = useState<CriteriosDeListado>(CRITERIOS_POR_DEFECTO)
  const [etiquetas, setEtiquetas] = useState<readonly Etiqueta[]>(ESPACIO_DE_PRUEBA?.etiquetas ?? [])
  const [asignaciones, setAsignaciones] = useState<readonly AsignacionDeEtiqueta[]>(
    ESPACIO_DE_PRUEBA?.asignaciones ?? [],
  )

  /* La validación se simula en memoria: aquí no hay Supabase al que pedirle nada. */
  const fichas = useMemo(
    () =>
      FICHAS_DE_EJEMPLO.map((ficha) =>
        validadas.includes(ficha.id) ? { ...ficha, estadoDeValidacion: 'validada' as const } : ficha,
      ),
    [validadas],
  )

  const listadas = useMemo(
    () => listarConferencias({ visibles: VISIBLES, criterios, asignaciones, fichas }),
    [criterios, asignaciones, fichas],
  )

  function etiquetasDe(idConferencia: string): readonly EtiquetaVisible[] {
    return asignaciones
      .filter((asignacion) => asignacion.idConferencia === idConferencia)
      .flatMap((asignacion) => {
        const etiqueta = etiquetas.find((candidata) => candidata.id === asignacion.idEtiqueta)
        return etiqueta === undefined ? [] : [{ etiqueta, propia: true }]
      })
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-fondo p-8 font-sans text-texto">
      <PantallaArchivo
        visibles={listadas}
        fichas={fichas}
        temas={TEMAS_DE_EJEMPLO}
        cargando={false}
        error={null}
        alCargarConferencia={() => undefined}
        alValidar={(idFicha) => setValidadas((anteriores) => [...anteriores, idFicha])}
        criterios={criterios}
        etiquetas={etiquetas}
        etiquetasDe={etiquetasDe}
        hayConferenciasSinFiltrar={VISIBLES.length > 0}
        alCambiarCriterios={(cambio) => setCriterios((anteriores) => ({ ...anteriores, ...cambio }))}
        alAlternarEtiquetaDelFiltro={(idEtiqueta) =>
          setCriterios((anteriores) => ({
            ...anteriores,
            etiquetas: anteriores.etiquetas.includes(idEtiqueta)
              ? anteriores.etiquetas.filter((id) => id !== idEtiqueta)
              : [...anteriores.etiquetas, idEtiqueta],
          }))
        }
        alCrearEtiqueta={(nombre) => {
          const limpio = nombre.trim()

          if (etiquetas.some((etiqueta) => etiqueta.nombre.toLowerCase() === limpio.toLowerCase())) {
            return Promise.resolve({ ok: false, mensaje: 'Ya tienes una etiqueta con ese nombre.' })
          }

          const etiqueta: Etiqueta = {
            id: `etq-prueba-${limpio}`,
            nombre: limpio,
            idPropietario: ID_DE_PRUEBA,
          }
          setEtiquetas((anteriores) => [...anteriores, etiqueta])

          return Promise.resolve({ ok: true, etiqueta })
        }}
        alAlternarAsignacion={(idEtiqueta, idConferencia) =>
          setAsignaciones((anteriores) =>
            anteriores.some(
              (asignacion) =>
                asignacion.idEtiqueta === idEtiqueta && asignacion.idConferencia === idConferencia,
            )
              ? anteriores.filter(
                  (asignacion) =>
                    !(asignacion.idEtiqueta === idEtiqueta && asignacion.idConferencia === idConferencia),
                )
              : [...anteriores, { idEtiqueta, idConferencia }],
          )
        }
      />
    </div>
  )
}
