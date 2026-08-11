import { useState, type FormEvent, type ReactElement } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { useSession } from '@/features/auth/session'
import { mensajeDeError } from '@/shared/errors'
import { Button, Field, Input } from '@/shared/ui'
import { destinoTrasAcceder } from './destino'
import { CLASES_ENLACE, MarcoDeAcceso, PieDeMarco } from './MarcoDeAcceso'
import { MensajeDeFormulario } from './MensajeDeFormulario'

const ID_ERROR = 'registro-error'

/*
  Pantalla pública de registro. Mismo trato que la de acceso: la validación de
  campos vacíos y de correo duplicado vive en la sesión (`registrar`), y aquí
  solo se traduce el código recibido a un mensaje para la interfaz.
*/
export function PantallaRegistro(): ReactElement {
  const { registrar } = useSession()
  const navegar = useNavigate()
  const ubicacion = useLocation()

  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function alEnviar(evento: FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault()
    if (enviando) return

    setEnviando(true)
    setError(null)

    try {
      const resultado = await registrar(nombre, correo, contrasena)

      if (!resultado.ok) {
        setError(mensajeDeError(resultado.codigo))
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
      setError(mensajeDeError('AUTH_FALLO_INESPERADO'))
      setEnviando(false)
    }
  }

  return (
    <MarcoDeAcceso idTitulo="registro-titulo" titulo="Crear tu cuenta">
      <form
        noValidate
        onSubmit={(evento) => {
          void alEnviar(evento)
        }}
        aria-describedby={error === null ? undefined : ID_ERROR}
        className="mt-5 flex flex-col gap-4"
      >
        <Field id="registro-nombre" etiqueta="Nombre">
          <Input
            type="text"
            name="nombre"
            autoComplete="name"
            value={nombre}
            onChange={(evento) => setNombre(evento.target.value)}
          />
        </Field>

        <Field id="registro-correo" etiqueta="Correo">
          <Input
            type="email"
            name="correo"
            autoComplete="email"
            value={correo}
            onChange={(evento) => setCorreo(evento.target.value)}
          />
        </Field>

        <Field id="registro-contrasena" etiqueta="Contraseña">
          <Input
            type="password"
            name="contrasena"
            autoComplete="new-password"
            value={contrasena}
            onChange={(evento) => setContrasena(evento.target.value)}
          />
        </Field>

        {error === null ? null : <MensajeDeFormulario id={ID_ERROR}>{error}</MensajeDeFormulario>}

        <Button type="submit" variante="primario" cargando={enviando} className="mt-1 w-full">
          Crear cuenta
        </Button>
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
