import type { ReactElement } from 'react'
import { useState } from 'react'
import { useSession } from '@/features/auth/session'
import { useConferenciasVisibles } from '@/features/conferencias/components'
import { nombreDePersona } from '@/features/conferencias/data'
import { privacidadEfectiva } from '@/features/conferencias/query'
import type { ConferenciaVisible } from '@/features/conferencias/query'
import { Button, EncabezadoDeSeccion, Field, Input, MensajeDeFormulario } from '@/shared/ui'
import { useApiKey } from '../useApiKey'

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
  const { clave, guardar } = useApiKey(idUsuario)
  const [valor, setValor] = useState('')
  const [mensaje, setMensaje] = useState<{ texto: string; esError: boolean } | null>(null)

  function alGuardar(): void {
    const resultado = guardar(valor)
    setMensaje(
      resultado.ok
        ? { texto: 'API key guardada.', esError: false }
        : { texto: resultado.mensaje, esError: true },
    )
    if (resultado.ok) {
      setValor('')
    }
  }

  return (
    <section className="flex flex-col gap-4 rounded-md bg-panel p-6 shadow-sm">
      <div>
        <h2 className="text-base font-semibold tracking-tight text-texto">API key</h2>
        <p className="mt-1 text-sm text-texto-tenue">
          Se usará para las llamadas a OpenAI cuando el backend esté conectado. Por ahora se guarda solo en
          este navegador, en texto plano — no la reutilices de un servicio con datos sensibles.
        </p>
      </div>

      {clave !== null ? <p className="text-xs text-texto-tenue">Ya tienes una API key guardada. Escribe una nueva para reemplazarla.</p> : null}

      <Field id="config-api-key" etiqueta="API key">
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

      <div>
        <Button variante="secundario" onClick={alGuardar}>
          Guardar
        </Button>
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
