import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useId, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import { Link } from 'react-router'
import type { UsuarioSesion } from '@/features/auth/session'
import { useApiKey } from '@/features/configuracion/useApiKey'
import { useTema, type Tema } from '@/shared/tema'
import { Modal } from '@/shared/ui'
import { inicialesDe } from './inicialesDe'

const OPCIONES_DE_TEMA: ReadonlyArray<{ valor: Tema; etiqueta: string; icono: string }> = [
  { valor: 'claro', etiqueta: 'Claro', icono: 'light_mode' },
  { valor: 'oscuro', etiqueta: 'Oscuro', icono: 'dark_mode' },
  { valor: 'sistema', etiqueta: 'Sistema', icono: 'desktop_windows' },
]

const FILA =
  'flex h-12 w-full cursor-pointer items-center gap-3 rounded-2xl px-3 text-base transition-colors hover:bg-acento-tenue'

/*
  El menú de la cuenta, en el modal del sistema anclado a la tarjeta: crece
  desde ella, igual que la campana crece desde su botón. Antes era el
  popover suelto del diseño anterior, con filetes entre filas, iconos de
  otra familia y el tema en botones de 11 px.

  Lleva lo que se hace con la cuenta y nada más: el aviso de la clave si
  falta, el tema, Configuración y cerrar sesión. El nombre y el correo no se
  repiten dentro: ya están en la tarjeta que lo abre.
*/
export function MenuDeCuenta({
  usuario,
  cerrarSesion,
}: {
  usuario: UsuarioSesion
  cerrarSesion: () => void
}): ReactElement {
  const { tema, establecerTema } = useTema()
  /* Con las claves compartidas por la administración, a nadie le falta una. */
  const { puedeUsarIa, cargando: cargandoApiKey } = useApiKey()
  const apiKeyFaltante = !cargandoApiKey && !puedeUsarIa
  const nombreVisible = usuario.nombre === '' ? usuario.correo : usuario.nombre
  const reducirMovimiento = useReducedMotion()
  const [abierto, setAbierto] = useState(false)
  const boton = useRef<HTMLButtonElement>(null)
  const idDelPanel = useId()

  const cerrar = (): void => setAbierto(false)

  return (
    <>
      <button
        ref={boton}
        type="button"
        onClick={() => setAbierto(true)}
        aria-haspopup="dialog"
        aria-expanded={abierto}
        aria-controls={idDelPanel}
        aria-label={
          apiKeyFaltante ? `Cuenta de ${nombreVisible}, falta configurar la API key` : `Cuenta de ${nombreVisible}`
        }
        className="flex w-full cursor-pointer items-center gap-3 rounded-[20px] p-2 text-left transition-colors hover:bg-acento-tenue"
      >
        {/*
          Dos círculos concéntricos, como la referencia: un aro gris de 40px que
          lo despega del fondo y, dentro, el disco con las iniciales.
        */}
        <span aria-hidden="true" className="relative flex min-w-0 flex-1 items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-acento-tenue">
            <span className="flex size-9 items-center justify-center rounded-full bg-acento text-sm font-semibold text-acento-contraste">
              {inicialesDe(usuario.nombre, usuario.correo)}
            </span>
          </span>

          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-semibold text-texto">{nombreVisible}</span>
            <span className="truncate text-xs text-texto-tenue">{usuario.correo}</span>
          </span>

          <AnimatePresence>
            {apiKeyFaltante ? (
              <motion.span
                initial={reducirMovimiento ? false : { opacity: 0, scale: 0.4 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.4 }}
                transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="absolute top-0 left-8 size-2.5 rounded-full bg-pendiente ring-2 ring-fondo"
              />
            ) : null}
          </AnimatePresence>
        </span>
      </button>

      <Modal abierto={abierto} alCerrar={cerrar} titulo="Tu cuenta" ancho="angosto" anclaje="disparador" anclaEn={boton}>
        <div id={idDelPanel} className="flex flex-col gap-5 pb-1">
          {apiKeyFaltante ? (
            <Link
              to="/configuracion#config-api-key"
              onClick={cerrar}
              className="flex items-start gap-3 rounded-[20px] bg-ilustracion p-4 text-ilustracion-texto transition-opacity hover:opacity-90"
            >
              <span aria-hidden="true" className="material-symbols-rounded icono-relleno text-[22px]">
                key
              </span>
              <span className="text-sm leading-relaxed">
                Falta tu API key. Configúrala para poder cargar conferencias.
              </span>
            </Link>
          ) : null}

          <div className="flex flex-col gap-2">
            <p className="px-1 text-sm font-medium text-texto-tenue">Tema</p>
            {/*
              El tema elegido lleva la superficie clara dentro del carril, como
              una pastilla que se desliza entre tres. Cambiarlo no cierra el
              menú: se prueba y se compara sin tener que volver a abrirlo.
            */}
            <div className="grid grid-cols-3 gap-1 rounded-full bg-acento-tenue p-1">
              {OPCIONES_DE_TEMA.map(({ valor, etiqueta, icono }) => (
                <button
                  key={valor}
                  type="button"
                  onClick={() => establecerTema(valor)}
                  aria-pressed={tema === valor}
                  className={`flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-full text-sm transition-colors ${
                    tema === valor ? 'bg-fondo font-medium text-texto' : 'text-texto-tenue hover:text-texto'
                  }`}
                >
                  <span aria-hidden="true" className="material-symbols-rounded icono-contorno text-lg">
                    {icono}
                  </span>
                  {etiqueta}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col">
            <Link to="/configuracion" onClick={cerrar} className={`${FILA} text-texto`}>
              <span aria-hidden="true" className="material-symbols-rounded icono-contorno text-xl text-texto-tenue">
                settings
              </span>
              Configuración
            </Link>

            <button
              type="button"
              onClick={() => {
                cerrar()
                cerrarSesion()
              }}
              className={`${FILA} text-texto-tenue hover:text-error`}
            >
              <span aria-hidden="true" className="material-symbols-rounded icono-contorno text-xl">
                logout
              </span>
              Cerrar sesión
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
