import type { ReactElement, ReactNode } from 'react'
import { motion, useReducedMotion, type Variants } from 'motion/react'
import { Logo } from '@/shared/ui'

/*
  Marco visual común a las dos pantallas públicas de autenticación.

  Dos paneles sobre el fondo de la app, con los radios y la tipografía del
  resto: a la izquierda el formulario, a la derecha el producto. Antes el
  panel de la derecha era un campo azul profundo con su propia paleta, lo
  único que quedaba del diseño anterior; ahora es un panel más, y lo que lo
  distingue es su contenido —el nombre grande y una ficha de ejemplo que
  enseña qué se guarda—, no un color que el resto de la app ya no usa.

  Sin cabecera compacta para pantallas estrechas: la app no se abre en
  móvil (ver `app/SoloEscritorio.tsx`), así que el panel de marca siempre
  está a la vista y lleva el único h1.
*/

const DESCRIPCION = 'Archivo consultable de lo que se dijo en cada conferencia.'

const CONTENEDOR: Variants = {
  oculto: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
}

const ELEMENTO: Variants = {
  oculto: { opacity: 0, y: 14, filter: 'blur(8px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.5, ease: [0.37, 0.35, 0, 1] },
  },
}

export type PropsMarcoDeAcceso = {
  /* Id del título del panel, para dar nombre accesible a la sección. */
  idTitulo: string
  titulo: string
  children: ReactNode
}

export function MarcoDeAcceso({ idTitulo, titulo, children }: PropsMarcoDeAcceso): ReactElement {
  const reducirMovimiento = useReducedMotion()
  const estadoInicial = reducirMovimiento ? 'visible' : 'oculto'

  return (
    <main className="grid h-dvh grid-cols-[1fr_1.05fr] gap-4 overflow-hidden bg-fondo p-4 font-sans text-texto">
      <motion.div
        variants={CONTENEDOR}
        initial={estadoInicial}
        animate="visible"
        className="flex min-h-0 flex-col overflow-y-auto px-6 py-8"
      >
        <motion.div variants={ELEMENTO}>
          <Logo />
        </motion.div>

        <div className="flex flex-1 items-center justify-center py-8">
          <motion.section
            variants={ELEMENTO}
            aria-labelledby={idTitulo}
            className="w-full max-w-[26rem] rounded-[32px] bg-panel p-8"
          >
            <h2 id={idTitulo} className="font-titulo text-[28px] leading-tight font-semibold text-texto">
              {titulo}
            </h2>

            {children}
          </motion.section>
        </div>
      </motion.div>

      <motion.aside
        variants={CONTENEDOR}
        initial={estadoInicial}
        animate="visible"
        className="flex min-h-0 flex-col justify-between overflow-hidden rounded-[32px] bg-panel p-12"
      >
        <div>
          <motion.h1
            variants={ELEMENTO}
            className="font-titulo text-6xl leading-[1.02] font-semibold tracking-tight text-texto"
          >
            Menti Vault
          </motion.h1>

          <motion.p variants={ELEMENTO} className="mt-5 max-w-sm text-lg leading-relaxed text-texto-tenue">
            {DESCRIPCION}
          </motion.p>
        </div>

        {/*
          Una ficha de ejemplo, con la forma de las de verdad: el texto que se
          lee, quién lo dijo y en qué minuto. Enseña qué hace el producto
          mejor que una frase sobre él. Es ilustrativa y lo dice.
        */}
        <motion.figure variants={ELEMENTO} aria-label="Ficha de ejemplo" className="max-w-md rounded-[24px] bg-fondo p-6">
          <p className="text-xs font-medium tracking-wide text-texto-tenue uppercase">Ficha de ejemplo</p>
          <blockquote className="mt-3 font-titulo text-xl leading-snug font-medium text-texto">
            Un archivo no sirve por lo que guarda, sino por lo que te deja volver a encontrar.
          </blockquote>
          <figcaption className="mt-4 flex items-center gap-2 text-sm text-texto-tenue">
            <span className="rounded-full bg-ilustracion px-2.5 py-0.5 text-ilustracion-texto">Tesis</span>
            Minuto 12:40 de la conferencia
          </figcaption>
        </motion.figure>
      </motion.aside>
    </main>
  )
}

/*
  Pie del panel: la vía alterna (registrarse o volver al acceso). Se separa del
  formulario con un filete para que no compita con el botón principal.
*/
export function PieDeMarco({ children }: { children: ReactNode }): ReactElement {
  return <p className="mt-6 border-t border-filete pt-5 text-sm text-texto-tenue">{children}</p>
}

/* Enlace de texto dentro del panel. Subrayado siempre visible: no depende del color. */
export const CLASES_ENLACE = 'rounded-md font-medium text-acento underline underline-offset-2'
