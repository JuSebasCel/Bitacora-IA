import type { ReactElement, ReactNode } from 'react'
import { motion, useReducedMotion, type Variants } from 'motion/react'

/*
  Marco visual común a las dos pantallas públicas de autenticación.

  Se compone en dos paneles: a la izquierda el formulario, a la derecha el panel
  de identidad del producto. Bajo 1024px el panel de identidad desaparece y su
  encabezado compacto ocupa su lugar sobre el formulario.

  El h1 aparece dos veces en el marcado, una por panel, pero solo uno existe a la
  vez: `hidden` resuelve a `display: none`, que también lo saca del árbol de
  accesibilidad. Así cada viewport expone exactamente un h1.
*/

const DESCRIPCION = 'Archivo consultable de lo que se dijo en cada conferencia.'

const CONTENEDOR: Variants = {
  oculto: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
}

const ELEMENTO: Variants = {
  oculto: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
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
    <main className="min-h-dvh bg-fondo font-sans lg:grid lg:min-h-dvh lg:grid-cols-[1fr_1.05fr]">
      <motion.div
        variants={CONTENEDOR}
        initial={estadoInicial}
        animate="visible"
        className="flex min-h-dvh items-center justify-center px-5 py-12 lg:min-h-0 lg:px-10"
      >
        <div className="w-full max-w-sm">
          <motion.header variants={ELEMENTO} className="mb-7 lg:hidden">
            <h1 className="text-3xl font-semibold tracking-tight text-texto">Menti Vault</h1>
            <p className="mt-2 text-sm text-texto-tenue">{DESCRIPCION}</p>
          </motion.header>

          <motion.section
            variants={ELEMENTO}
            aria-labelledby={idTitulo}
            className="elevacion rounded-md border border-filete bg-panel p-6 sm:p-7"
          >
            <h2 id={idTitulo} className="text-base font-semibold tracking-tight text-texto">
              {titulo}
            </h2>

            {children}
          </motion.section>
        </div>
      </motion.div>

      <aside className="panel-de-marca relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <motion.div
          variants={CONTENEDOR}
          initial={estadoInicial}
          animate="visible"
          className="relative"
        >
          <motion.h1
            variants={ELEMENTO}
            className="text-5xl leading-[1.05] font-semibold tracking-tight text-marca-texto xl:text-6xl"
          >
            Menti Vault
          </motion.h1>

          <motion.p
            variants={ELEMENTO}
            className="mt-5 max-w-sm text-base leading-relaxed text-marca-tenue"
          >
            {DESCRIPCION}
          </motion.p>
        </motion.div>

        <motion.p
          variants={ELEMENTO}
          initial={estadoInicial}
          animate="visible"
          className="coordenada relative max-w-xs text-xs leading-relaxed tracking-wide text-marca-tenue"
        >
          Cada ficha conserva quién lo dijo, en qué conferencia y en qué minuto exacto.
        </motion.p>
      </aside>
    </main>
  )
}

/*
  Pie del panel: la vía alterna (registrarse o volver al acceso). Se separa del
  formulario con un filete para que no compita con el botón principal.
*/
export function PieDeMarco({ children }: { children: ReactNode }): ReactElement {
  return <p className="mt-6 border-t border-filete pt-4 text-sm text-texto-tenue">{children}</p>
}

/* Enlace de texto dentro del panel. Subrayado siempre visible: no depende del color. */
export const CLASES_ENLACE = 'rounded-md font-medium text-acento underline underline-offset-2'
