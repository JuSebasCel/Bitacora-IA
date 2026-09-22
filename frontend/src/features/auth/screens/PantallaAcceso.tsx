import { useState, type FormEvent, type ReactElement } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { esCorreoValido, useSession } from '@/features/auth/session'
import { mensajeDeError } from '@/shared/errors'
import { Button, CampoDeContrasena, Field, Input, MensajeDeFormulario } from '@/shared/ui'
import { destinoTrasAcceder } from './destino'
import { CLASES_ENLACE, MarcoDeAcceso, PieDeMarco } from './MarcoDeAcceso'

const ID_ERROR = 'acceso-error'

type ErroresDeCampo = { correo?: string; contrasena?: string }

/*
  Pantalla pública de acceso. El correo o la contraseña incorrectos se
  muestran como un único mensaje general a propósito (`AUTH_CREDENCIALES_INVALIDAS`):
  señalar cuál de los dos campos falló sería revelar si ese correo tiene
  cuenta, una fuga de enumeración de usuarios. Los campos vacíos y el formato
  del correo, en cambio, sí se validan y se marcan por campo, sin red.
*/
export function PantallaAcceso(): ReactElement {
  const { acceder } = useSession()
  const navegar = useNavigate()
  const ubicacion = useLocation()

  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [erroresDeCampo, setErroresDeCampo] = useState<ErroresDeCampo>({})
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  function limpiarErrorDeCampo(campo: keyof ErroresDeCampo): void {
    setErroresDeCampo((actuales) => ({ ...actuales, [campo]: undefined }))
  }

  async function alEnviar(evento: FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault()
    if (enviando) return

    const nuevosErrores: ErroresDeCampo = {}
    if (correo.trim() === '') {
      nuevosErrores.correo = mensajeDeError('AUTH_CORREO_REQUERIDO')
    } else if (!esCorreoValido(correo)) {
      nuevosErrores.correo = mensajeDeError('AUTH_CORREO_INVALIDO')
    }
    if (contrasena === '') nuevosErrores.contrasena = mensajeDeError('AUTH_CONTRASENA_REQUERIDA')

    if (nuevosErrores.correo !== undefined || nuevosErrores.contrasena !== undefined) {
      setErroresDeCampo(nuevosErrores)
      return
    }

    setEnviando(true)
    setErroresDeCampo({})
    setErrorGeneral(null)

    try {
      const resultado = await acceder(correo, contrasena)

      if (!resultado.ok) {
        setErrorGeneral(mensajeDeError(resultado.codigo))
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
      setErrorGeneral(mensajeDeError('AUTH_FALLO_INESPERADO'))
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
        aria-describedby={errorGeneral === null ? undefined : ID_ERROR}
        className="mt-5 flex flex-col gap-4"
      >
        <Field id="acceso-correo" etiqueta="Correo" obligatorio error={erroresDeCampo.correo}>
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

        <Field
          id="acceso-contrasena"
          etiqueta="Contraseña"
          obligatorio
          error={erroresDeCampo.contrasena}
        >
          <CampoDeContrasena
            name="contrasena"
            autoComplete="current-password"
            placeholder="••••••••"
            value={contrasena}
            onChange={(evento) => {
              setContrasena(evento.target.value)
              limpiarErrorDeCampo('contrasena')
            }}
          />
        </Field>

        {errorGeneral === null ? null : (
          <MensajeDeFormulario id={ID_ERROR}>{errorGeneral}</MensajeDeFormulario>
        )}

        <p className="text-xs text-texto-tenue">
          <span className="text-error">*</span> Campo obligatorio
        </p>

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
