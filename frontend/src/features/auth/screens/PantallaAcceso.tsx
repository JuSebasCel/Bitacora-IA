import { useState, type FormEvent, type ReactElement } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { useSession } from '@/features/auth/session'
import { mensajeDeError } from '@/shared/errors'
import { Button, Field, Input, MensajeDeFormulario } from '@/shared/ui'
import { destinoTrasAcceder } from './destino'
import { CLASES_ENLACE, MarcoDeAcceso, PieDeMarco } from './MarcoDeAcceso'

const ID_ERROR = 'acceso-error'

/*
  Pantalla pública de acceso. La validación de campos, formato de correo y
  credenciales vive en la sesión (`acceder`), no aquí: esta pantalla envía,
  traduce el código que reciba y navega cuando el acceso prospera.
*/
export function PantallaAcceso(): ReactElement {
  const { acceder } = useSession()
  const navegar = useNavigate()
  const ubicacion = useLocation()

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
      const resultado = await acceder(correo, contrasena)

      if (!resultado.ok) {
        setError(mensajeDeError(resultado.codigo))
        setEnviando(false)
        return
      }

      /* Se deja el estado de envío puesto: la navegación desmonta la pantalla. */
      navegar(destinoTrasAcceder(ubicacion.state), { replace: true })
    } catch {
      /*
        Hoy `acceder` no hace red, pero en B1 sí. Sin este camino, un rechazo
        dejaría el botón deshabilitado para siempre y sin explicación.
      */
      setError(mensajeDeError('AUTH_FALLO_INESPERADO'))
      setEnviando(false)
    }
  }

  return (
    <MarcoDeAcceso idTitulo="acceso-titulo" titulo="Acceder a tu bitácora">
      <form
        noValidate
        onSubmit={(evento) => {
          void alEnviar(evento)
        }}
        aria-describedby={error === null ? undefined : ID_ERROR}
        className="mt-5 flex flex-col gap-4"
      >
        <Field id="acceso-correo" etiqueta="Correo">
          <Input
            type="email"
            name="correo"
            autoComplete="email"
            placeholder="nombre.apellido@labanfora.org"
            value={correo}
            onChange={(evento) => setCorreo(evento.target.value)}
          />
        </Field>

        <Field id="acceso-contrasena" etiqueta="Contraseña">
          <Input
            type="password"
            name="contrasena"
            autoComplete="current-password"
            placeholder="••••••••"
            value={contrasena}
            onChange={(evento) => setContrasena(evento.target.value)}
          />
        </Field>

        {error === null ? null : <MensajeDeFormulario id={ID_ERROR}>{error}</MensajeDeFormulario>}

        <Button type="submit" variante="primario" cargando={enviando} className="mt-1 w-full">
          Acceder
        </Button>
      </form>

      <PieDeMarco>
        ¿Todavía no tienes cuenta?{' '}
        <Link to="/registro" className={CLASES_ENLACE}>
          Crear cuenta
        </Link>
      </PieDeMarco>
    </MarcoDeAcceso>
  )
}
