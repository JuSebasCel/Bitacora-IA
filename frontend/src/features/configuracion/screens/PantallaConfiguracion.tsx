import type { ReactElement } from 'react'
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router'
import { useSession } from '@/features/auth/session'
import { useConferenciasVisibles } from '@/features/conferencias/components'
import { nombreDePersona } from '@/features/conferencias/data'
import { privacidadEfectiva } from '@/features/conferencias/query'
import type { ConferenciaVisible } from '@/features/conferencias/query'
import { Button, EncabezadoDeSeccion, Field, Input, MensajeDeFormulario } from '@/shared/ui'
import { useApiKey } from '../useApiKey'

const ID_CAMPO_API_KEY = 'config-api-key'

/*
  Configuración (F8): API key propia, y conferencias compartidas conmigo.

  Compartir una conferencia YA NO vive aquí: vivía en un formulario que
  obligaba a volver a encontrar la conferencia en un desplegable genérico,
  pese a que casi siempre se comparte justo después de estar viéndola. Ahora
  el botón "Compartir" está en el detalle de la conferencia misma
  (`PantallaDetalleConferencia.tsx`, `DialogoDeCompartir`), con la
  conferencia ya puesta — esta pantalla no necesita saber cuál.
*/

function SeccionApiKey({ idUsuario }: { idUsuario: string }): ReactElement {
  const { clave, cargando, guardar, borrar } = useApiKey(idUsuario)
  const [valor, setValor] = useState('')
  const [mensaje, setMensaje] = useState<{ texto: string; esError: boolean } | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function alGuardar(): Promise<void> {
    if (enviando) return
    setEnviando(true)

    const resultado = await guardar(valor)
    setMensaje(
      resultado.ok
        ? { texto: 'API key guardada.', esError: false }
        : { texto: resultado.mensaje, esError: true },
    )
    if (resultado.ok) {
      setValor('')
    }
    setEnviando(false)
  }

  async function alQuitar(): Promise<void> {
    if (enviando) return
    setEnviando(true)

    const resultado = await borrar()
    setMensaje(
      resultado.ok
        ? { texto: 'API key eliminada.', esError: false }
        : { texto: resultado.mensaje, esError: true },
    )
    setEnviando(false)
  }

  return (
    <section className="flex flex-col gap-4 rounded-md bg-panel p-6 shadow-sm">
      <div>
        <h2 className="text-base font-semibold tracking-tight text-texto">API key</h2>
        <p className="mt-1 text-sm text-texto-tenue">
          Se usa para las llamadas a OpenAI que hagas vos: cargar conferencias y consultar el chat. Se
          guarda cifrada, y solo vos podés leerla o reemplazarla.
        </p>
      </div>

      <details className="rounded-md border border-filete bg-fondo p-3 text-sm text-texto-tenue">
        <summary className="cursor-pointer font-medium text-texto">¿Cómo consigo una API key?</summary>
        <ol className="mt-2 flex list-decimal flex-col gap-1 pl-4">
          <li>
            Entra a{' '}
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noreferrer"
              className="text-acento underline underline-offset-2"
            >
              platform.openai.com/api-keys
            </a>{' '}
            con tu cuenta de OpenAI.
          </li>
          <li>Pulsa «Create new secret key» y ponle un nombre, por ejemplo «Bitácora AI».</li>
          <li>
            Copia la clave que empieza por <code className="coordenada">sk-</code> y pégala abajo — OpenAI
            solo la muestra una vez.
          </li>
        </ol>
      </details>

      {/*
        El mensaje de "ya tienes una guardada" y el de "API key guardada"
        dicen básicamente lo mismo justo después de guardar -- se ocultan
        mutuamente en vez de mostrar los dos a la vez.
      */}
      {mensaje !== null ? null : cargando ? (
        <p className="text-xs text-texto-tenue">Cargando…</p>
      ) : clave !== null ? (
        <p className="text-xs text-texto-tenue">Ya tienes una API key guardada. Escribe una nueva para reemplazarla.</p>
      ) : null}

      <Field id={ID_CAMPO_API_KEY} etiqueta="API key">
        <Input
          type="password"
          autoComplete="off"
          value={valor}
          onChange={(evento) => setValor(evento.target.value)}
          placeholder="sk-…"
        />
      </Field>

      {mensaje !== null && mensaje.esError ? <MensajeDeFormulario id="config-api-key-error">{mensaje.texto}</MensajeDeFormulario> : null}
      {mensaje !== null && !mensaje.esError ? <p className="text-xs text-validado">{mensaje.texto}</p> : null}

      <div className="flex gap-2">
        <Button
          variante="secundario"
          cargando={enviando}
          onClick={() => {
            void alGuardar()
          }}
        >
          Guardar
        </Button>

        {cargando || clave === null ? null : (
          <Button
            variante="sutil"
            disabled={enviando}
            onClick={() => {
              void alQuitar()
            }}
          >
            Quitar mi API key
          </Button>
        )}
      </div>
    </section>
  )
}

function SeccionCompartidasConmigo({ visibles }: { visibles: readonly ConferenciaVisible[] }): ReactElement {
  const compartidas = visibles.filter((visible) => visible.procedencia === 'compartida')

  return (
    <section className="flex flex-col gap-4 rounded-md bg-panel p-6 shadow-sm">
      <div>
        <h2 className="text-base font-semibold tracking-tight text-texto">Compartidas conmigo</h2>
        <p className="mt-1 text-sm text-texto-tenue">Conferencias que otras personas del grupo compartieron contigo.</p>
      </div>

      {compartidas.length === 0 ? (
        <p className="text-sm text-texto-tenue">Nadie ha compartido ninguna conferencia contigo todavía.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {compartidas.map((visible) => {
            const privacidad = privacidadEfectiva(visible)

            return (
              <li key={visible.conferencia.id} className="rounded-md bg-fondo p-3">
                <p className="text-sm font-medium text-texto">{visible.conferencia.titulo}</p>
                <p className="text-xs text-texto-tenue">
                  Compartida por {nombreDePersona(visible.conferencia.idDueno) ?? 'otra persona'}
                </p>
                <p className="mt-1 text-xs text-texto-tenue">
                  {[
                    privacidad.compartirEtiquetas ? 'etiquetas visibles' : null,
                    privacidad.compartirFichasPendientes ? 'incluye pendientes' : null,
                    privacidad.permitirValidarFichas ? 'puedes validar' : null,
                    privacidad.permitirRecompartir ? 'puedes recompartir' : null,
                  ]
                    .filter((texto) => texto !== null)
                    .join(' · ') || 'sin permisos adicionales'}
                </p>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export function PantallaConfiguracion(): ReactElement {
  const { usuario } = useSession()
  const idUsuario = usuario?.id ?? ''
  const { visibles } = useConferenciasVisibles(idUsuario)
  const ubicacion = useLocation()

  /*
    Quien llega desde el aviso de API key faltante (el menú de cuenta, o el
    panel de carga de conferencia) trae `#config-api-key` en la URL: el
    campo se desplaza a la vista y recibe el foco, en vez de dejar a la
    persona a buscarlo en una pantalla con dos secciones.
  */
  useEffect(() => {
    if (ubicacion.hash !== `#${ID_CAMPO_API_KEY}`) {
      return
    }

    const campo = document.getElementById(ID_CAMPO_API_KEY)
    campo?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    campo?.focus()
  }, [ubicacion.hash])

  return (
    <>
      <EncabezadoDeSeccion
        titulo="Configuración"
        descripcion="Guarda tu API key y revisa las conferencias que otras personas del grupo compartieron contigo."
      />

      <div className="mt-6 flex flex-col gap-6">
        <SeccionApiKey idUsuario={idUsuario} />
        <SeccionCompartidasConmigo visibles={visibles} />
      </div>
    </>
  )
}
