import { useEffect, useState } from 'react'
import type { ReactElement, ReactNode } from 'react'
import { MarcaDeMenti } from '@/shared/ui'

/*
  La app, solo en pantallas de escritorio.

  El diseño todavía no es responsivo: el explorador de columnas, la
  configuración de plantillas y el dock están pensados para un ancho de
  computador, y en un teléfono se rompen de maneras que dan una primera
  impresión peor que no dejar entrar. Hasta que haya un diseño para
  pantallas pequeñas, por debajo de 1024 px se enseña este aviso en lugar de
  la interfaz, también en el acceso: entrar para encontrarse todo roto
  justo después no es mejor.

  Se decide por el ancho de la ventana y no por el tipo de dispositivo: una
  ventana de escritorio estrechada a la mitad se rompe igual que un
  teléfono, y el aviso le dice qué hacer (ensancharla). Se escucha el
  cambio, así que al ensancharla la app aparece sin recargar.

  Sin `matchMedia` (jsdom, en las pruebas) se asume escritorio: el aviso es
  una protección de la interfaz, no una regla que deban cumplir las pruebas.
*/
const CONSULTA = '(min-width: 1024px)'

function esEscritorio(): boolean {
  return typeof window.matchMedia !== 'function' || window.matchMedia(CONSULTA).matches
}

export function SoloEscritorio({ children }: { children: ReactNode }): ReactElement {
  const [escritorio, setEscritorio] = useState(esEscritorio)

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return
    }

    const consulta = window.matchMedia(CONSULTA)
    const alCambiar = (): void => setEscritorio(consulta.matches)
    consulta.addEventListener('change', alCambiar)
    return () => consulta.removeEventListener('change', alCambiar)
  }, [])

  if (escritorio) {
    return <>{children}</>
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-fondo px-6 py-12 text-center font-sans text-texto">
      <MarcaDeMenti tamano={56} />

      <div className="flex max-w-sm flex-col gap-3">
        <h1 className="font-titulo text-[28px] leading-tight font-semibold">Menti Vault se usa en computador</h1>
        <p className="text-base leading-relaxed text-texto-tenue">
          Esta pantalla es muy pequeña para el archivo de conferencias. Ábrelo desde un computador, o ensancha la
          ventana si ya estás en uno.
        </p>
      </div>
    </main>
  )
}
