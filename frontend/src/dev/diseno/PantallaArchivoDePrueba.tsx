import { useState } from 'react'
import type { ReactElement } from 'react'
import { CONFERENCIAS_DE_EJEMPLO, FICHAS_DE_EJEMPLO } from '@/features/conferencias/data'
import type { ConferenciaVisible } from '@/features/conferencias/query'
import { PantallaArchivo } from '@/features/conferencias/screens/PantallaArchivo'
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

  Todo es propio (`procedencia: 'propia'`), que es el caso donde se pueden
  validar fichas — así el botón de validar aparece y se puede revisar.
*/

const VISIBLES: readonly ConferenciaVisible[] = CONFERENCIAS_DE_EJEMPLO.map((conferencia) => ({
  conferencia,
  procedencia: 'propia',
  comparticion: null,
}))

export function PantallaArchivoDePrueba(): ReactElement {
  const [validadas, setValidadas] = useState<readonly string[]>([])

  /* La validación se simula en memoria: aquí no hay Supabase al que pedirle nada. */
  const fichas = FICHAS_DE_EJEMPLO.map((ficha) =>
    validadas.includes(ficha.id) ? { ...ficha, estadoDeValidacion: 'validada' as const } : ficha,
  )

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-fondo p-8 font-sans text-texto">
      <PantallaArchivo
        visibles={VISIBLES}
        fichas={fichas}
        temas={TEMAS_DE_EJEMPLO}
        cargando={false}
        error={null}
        alCargarConferencia={() => undefined}
        alValidar={(idFicha) => setValidadas((anteriores) => [...anteriores, idFicha])}
      />
    </div>
  )
}
