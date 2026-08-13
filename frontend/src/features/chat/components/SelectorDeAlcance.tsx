import type { ReactElement } from 'react'
import type { AlcanceDeConsulta } from '../data/tipos'

export type PropsSelectorDeAlcance = {
  alcance: AlcanceDeConsulta
  alCambiar: (alcance: AlcanceDeConsulta) => void
}

/*
  Único chip real: "acotar a un tema o unas conferencias" no se arma aquí,
  ya existe ese camino en las opciones de aclaración que ofrece el propio
  chat (`MenuDeAclaracion`). Duplicar un selector de conferencias/temas en
  esta barra sería un segundo camino para llegar al mismo alcance.
*/
export function SelectorDeAlcance({ alcance, alCambiar }: PropsSelectorDeAlcance): ReactElement {
  const activo = alcance.tipo === 'todas'

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-filete px-3 py-2">
      <button
        type="button"
        onClick={() => alCambiar({ tipo: 'todas' })}
        className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
          activo ? 'bg-acento-tenue text-acento' : 'bg-fondo text-texto-tenue hover:text-texto'
        }`}
      >
        Todas mis conferencias
      </button>
      <p className="text-xs text-texto-tenue">
        Para acotar a un tema o unas conferencias, respóndele al chat cuando te lo proponga.
      </p>
    </div>
  )
}
