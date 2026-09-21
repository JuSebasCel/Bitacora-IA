import { useId } from 'react'
import type { ReactElement } from 'react'

/*
  La marca de Menti Vault: el dial de una caja fuerte —un anillo con su
  manija— recortado en un cuadrado redondeado.

  El dial dice "bóveda" sin necesitar el nombre, y el cuadrado tiene el
  mismo radio proporcional que las tarjetas de la app (24 sobre ~200 px).
  Es monocromo como el resto de la interfaz: el cuadrado toma el color del
  texto (`currentColor`) y el dial es un hueco, no un segundo color, así que
  funciona igual sobre el beige del tema claro y el negro del oscuro sin
  tocar nada. Reemplaza a la página pautada azul de Bitácora AI, que era de
  la paleta anterior.

  El `mask` necesita un id único: con dos logos en la misma página y un id
  fijo, el segundo usaría la máscara del primero.
*/
export function MarcaDeMenti({ tamano = 32, className }: { tamano?: number; className?: string }): ReactElement {
  const idDeMascara = useId()

  return (
    <svg
      viewBox="0 0 32 32"
      width={tamano}
      height={tamano}
      aria-hidden="true"
      className={className}
    >
      <defs>
        <mask id={idDeMascara}>
          <rect width="32" height="32" rx="9" fill="white" />
          <circle cx="16" cy="16" r="8.25" fill="none" stroke="black" strokeWidth="2.75" />
          <circle cx="16" cy="16" r="2.4" fill="black" />
          <path d="M16 16 L20.6 11.4" stroke="black" strokeWidth="2.75" strokeLinecap="round" />
        </mask>
      </defs>
      <rect width="32" height="32" rx="9" fill="currentColor" mask={`url(#${idDeMascara})`} />
    </svg>
  )
}

/** Marca y nombre juntos, para las pantallas donde el producto se presenta: el acceso y el aviso de escritorio. */
export function Logo({ tamano = 32 }: { tamano?: number }): ReactElement {
  return (
    <span className="inline-flex items-center gap-2.5 text-texto">
      <MarcaDeMenti tamano={tamano} />
      <span className="font-titulo text-[22px] leading-none font-semibold tracking-tight">Menti Vault</span>
    </span>
  )
}
