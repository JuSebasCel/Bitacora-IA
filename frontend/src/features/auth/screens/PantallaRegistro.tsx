import { useState, type FormEvent, type ReactElement } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { motion, useReducedMotion } from 'motion/react'
import { esCorreoValido, useSession } from '@/features/auth/session'
import { mensajeDeError, type CodigoError } from '@/shared/errors'
import { Button, Field, Input, MensajeDeFormulario } from '@/shared/ui'
import { ChecklistDeContrasena } from './ChecklistDeContrasena'
import { contrasenaCumpleTodo } from './reglasDeContrasena'
import { destinoTrasAcceder } from './destino'
import { CLASES_ENLACE, MarcoDeAcceso, PieDeMarco } from './MarcoDeAcceso'

const ID_ERROR = 'registro-error'

type Paso = 'correo' | 'detalles'

type ErroresDeCampo = { correo?: string; nombre?: string; contrasena?: string }

/*
  Traduce un código de error de `registrar` al lugar donde debe mostrarse.
  `AUTH_CREDENCIALES_INVALIDAS` no existe en este flujo (es propio de acceder),
  pero cualquier código sin campo asociado cae al banner general.
*/
function comoErrorDeCampo(codigo: CodigoError): keyof ErroresDeCampo | null {
  if (codigo === 'AUTH_NOMBRE_REQUERIDO') return 'nombre'
  if (codigo === 'AUTH_CORREO_REQUERIDO' || codigo === 'AUTH_CORREO_INVALIDO' || codigo === 'AUTH_CORREO_YA_REGISTRADO') {
    return 'correo'
  }
  if (codigo === 'AUTH_CONTRASENA_REQUERIDA' || codigo === 'AUTH_CONTRASENA_DEBIL') return 'contrasena'
  return null
}

/*
  Pantalla pública de registro, en dos pasos: primero el correo (se valida en
  el cliente, sin red), y solo después de resuelto se piden nombre y
  contraseña. El correo ya no comparte formulario con el resto de los campos:
  así se evita pedir el nombre antes de saber si la persona ya tiene cuenta.
*/
export function PantallaRegistro(): ReactElement {
  const { registrar } = useSession()
  const navegar = useNavigate()
  const ubicacion = useLocation()
  const reducirMovimiento = useReducedMotion()

  const [paso, setPaso] = useState<Paso>('correo')
  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [erroresDeCampo, setErroresDeCampo] = useState<ErroresDeCampo>({})
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  function limpiarErrorDeCampo(campo: keyof ErroresDeCampo): void {
    setErroresDeCampo((actuales) => ({ ...actuales, [campo]: undefined }))
  }

  function irADetalles(): void {
    if (correo.trim() === '') {
      setErroresDeCampo({ correo: mensajeDeError('AUTH_CORREO_REQUERIDO') })
      return
    }

    if (!esCorreoValido(correo)) {
      setErroresDeCampo({ correo: mensajeDeError('AUTH_CORREO_INVALIDO') })
      return
    }

    setErroresDeCampo({})
    setPaso('detalles')
  }

  async function alEnviar(evento: FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault()
    if (enviando) return

    /*
      Con un solo campo de texto visible, el Enter del paso `correo` dispara
      el envío del formulario aunque "Continuar" sea `type="button"` (regla de
      envío implícito de HTML). Se lo trata igual que un clic en "Continuar".
    */
    if (paso === 'correo') {
      irADetalles()
      return
    }

    const nuevosErrores: ErroresDeCampo = {}
    if (nombre.trim() === '') nuevosErrores.nombre = mensajeDeError('AUTH_NOMBRE_REQUERIDO')
    if (contrasena === '') {
      nuevosErrores.contrasena = mensajeDeError('AUTH_CONTRASENA_REQUERIDA')
    } else if (!contrasenaCumpleTodo(contrasena)) {
      nuevosErrores.contrasena = mensajeDeError('AUTH_CONTRASENA_DEBIL')
    }

    if (nuevosErrores.nombre !== undefined || nuevosErrores.contrasena !== undefined) {
      setErroresDeCampo(nuevosErrores)
      return
    }

    setEnviando(true)
    setErroresDeCampo({})
    setErrorGeneral(null)

    try {
      const resultado = await registrar(nombre, correo, contrasena)

      if (!resultado.ok) {
        const campo = comoErrorDeCampo(resultado.codigo)
        const mensaje = mensajeDeError(resultado.codigo)

        if (campo === 'correo') {
          /* El correo ya no es editable en este paso: se vuelve al paso donde sí lo es. */
          setErroresDeCampo({ correo: mensaje })
          setPaso('correo')
        } else if (campo !== null) {
          setErroresDeCampo({ [campo]: mensaje })
        } else {
          setErrorGeneral(mensaje)
        }

        setEnviando(false)
        return
      }

      /* Se deja el estado de envío puesto: la navegación desmonta la pantalla. */
      navegar(destinoTrasAcceder(ubicacion.state), { replace: true })
    } catch {
      /*
        Hoy `registrar` no hace red, pero en B1 sí. Sin este camino, un rechazo
        dejaría el botón deshabilitado para siempre y sin explicación.
      */
      setErrorGeneral(mensajeDeError('AUTH_FALLO_INESPERADO'))
      setEnviando(false)
    }
  }

  /*
    Solo se anima la entrada del paso que llega, sin `AnimatePresence`: un
    cruce con salida animada retendría el paso anterior montado hasta que
    termine su transición, lo que en pruebas (sin un ciclo de animación real)
    dejaría los dos pasos en el árbol a la vez.
  */
  const transicionPaso = reducirMovimiento
    ? {}
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] as const },
      }

  return (
    <MarcoDeAcceso idTitulo="registro-titulo" titulo="Crear tu cuenta">
      <form
        noValidate
        onSubmit={(evento) => {
          void alEnviar(evento)
        }}
        aria-describedby={errorGeneral === null ? undefined : ID_ERROR}
        className="mt-5 flex flex-col gap-4"
      >
        {paso === 'correo' ? (
            <motion.div key="correo" {...transicionPaso} className="flex flex-col gap-4">
              <Field
                id="registro-correo"
                etiqueta="Correo"
                obligatorio
                error={erroresDeCampo.correo}
              >
                <Input
                  type="email"
                  name="correo"
                  autoComplete="email"
                  placeholder="nombre.apellido@labanfora.org"
                  value={correo}
                  onChange={(evento) => {
                    setCorreo(evento.target.value)
                    limpiarErrorDeCampo('correo')
                  }}
                />
              </Field>

              <Button
                type="button"
                variante="primario"
                className="mt-1 w-full"
                onClick={irADetalles}
              >
                Continuar
              </Button>
            </motion.div>
          ) : (
            <motion.div key="detalles" {...transicionPaso} className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-2 rounded-md border border-filete bg-fondo px-3 py-2">
                <span className="truncate text-sm text-texto">{correo}</span>
                <button
                  type="button"
                  onClick={() => setPaso('correo')}
                  className={`shrink-0 text-xs ${CLASES_ENLACE}`}
                >
                  Cambiar
                </button>
              </div>

              <Field
                id="registro-nombre"
                etiqueta="Nombre"
                obligatorio
                error={erroresDeCampo.nombre}
              >
                <Input
                  type="text"
                  name="nombre"
                  autoComplete="name"
                  placeholder="Nombre Apellido Apellido"
                  value={nombre}
                  onChange={(evento) => {
                    setNombre(evento.target.value)
                    limpiarErrorDeCampo('nombre')
                  }}
                />
              </Field>

              <Field
                id="registro-contrasena"
                etiqueta="Contraseña"
                obligatorio
                error={erroresDeCampo.contrasena}
              >
                <Input
                  type="password"
                  name="contrasena"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={contrasena}
                  onChange={(evento) => {
                    setContrasena(evento.target.value)
                    limpiarErrorDeCampo('contrasena')
                  }}
                />
              </Field>

              <ChecklistDeContrasena contrasena={contrasena} />

              {errorGeneral === null ? null : (
                <MensajeDeFormulario id={ID_ERROR}>{errorGeneral}</MensajeDeFormulario>
              )}

              <Button type="submit" variante="primario" cargando={enviando} className="mt-1 w-full">
                Crear cuenta
              </Button>
            </motion.div>
          )}

        <p className="text-xs text-texto-tenue">
          <span className="text-error">*</span> Campo obligatorio
        </p>
      </form>

      <PieDeMarco>
        ¿Ya tienes una cuenta?{' '}
        <Link to="/acceso" className={CLASES_ENLACE}>
          Acceder
        </Link>
      </PieDeMarco>
    </MarcoDeAcceso>
  )
}
