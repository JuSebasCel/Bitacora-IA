import type { ReactElement } from 'react'
import { Link } from 'react-router'
import { TIPO_EN_SINGULAR } from '@/features/conferencias/components/vocabulario'
import type { FichaDelCatalogo } from '@/features/conferencias/query'
import { nombreDeTema } from '@/features/taxonomia'
import type { Tema } from '@/features/taxonomia'

export type PropsTarjetaDeFichaEnChat = {
  entrada: FichaDelCatalogo
  temas: readonly Tema[]
}

const LARGO_MAXIMO_DEL_FRAGMENTO = 140

/*
  Versión compacta de `FichaDeCatalogo.tsx` para citar una ficha dentro de
  una burbuja de respuesta: mismo chip de tema, mismo tipo de unidad, pero
  sin los metadatos completos (ponente, evento, fecha, coordenada) que ahí
  sí caben y aquí sobrecargarían una tarjeta pequeña.
*/
export function TarjetaDeFichaEnChat({ entrada, temas }: PropsTarjetaDeFichaEnChat): ReactElement {
  const { ficha, conferencia } = entrada
  const fragmento =
    ficha.fragmento.length > LARGO_MAXIMO_DEL_FRAGMENTO
      ? `${ficha.fragmento.slice(0, LARGO_MAXIMO_DEL_FRAGMENTO)}…`
      : ficha.fragmento

  return (
    <div className="flex flex-col gap-1.5 rounded-md bg-fondo p-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="rounded-md bg-acento-tenue px-1.5 py-0.5 text-xs font-medium text-acento">
          {nombreDeTema(temas, ficha.idTema)}
        </span>
        <span className="text-xs font-medium tracking-wide text-texto-tenue uppercase">
          {TIPO_EN_SINGULAR[ficha.tipoDeUnidad]}
        </span>
      </div>

      <p className="text-sm leading-snug text-texto">{fragmento}</p>

      <Link to={`/conferencias/${conferencia.id}`} className="text-xs font-medium text-acento hover:underline">
        {conferencia.titulo}
      </Link>
    </div>
  )
}
