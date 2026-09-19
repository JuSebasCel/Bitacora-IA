import { useRef, useState } from 'react'
import type { ReactElement } from 'react'
import { Dock, EstadoVacioIlustrado, Modal, SelectorDeVista } from './componentes'
import type { AnclajeDeModal, GrupoDelDock, OpcionDeVista } from './componentes'
import { EscalaTipografica } from './EscalaTipografica'
import { BotonPrimario, BotonSecundario, PildoraDeBusqueda } from './PildoraDiseno'
import { TarjetaContorno, TarjetaNotaRapida, TarjetaRellena } from './TarjetaDiseno'
import {
  M3_FONDO,
  M3_PANEL_ALTO,
  M3_PRIMARIO_BG,
  M3_PRIMARIO_TEXTO,
  M3_TEXTO,
  M3_TEXTO_SECUNDARIO,
  M3_TEXTO_TENUE,
} from './paleta'

/*
  Sandbox de revisión de diseño — sin enlazar desde ninguna navegación, se
  entra a mano por `/_diseno`. Junta fuera de todo dato real los componentes
  que se están calcando de la app de referencia, para poder juzgar el lenguaje
  completo antes de tocar un solo componente de la app.

  El interruptor claro/oscuro es de este sandbox, no del tema de la app:
  cambia `data-tema` sobre el contenedor `.lienzo-m3`, que es donde viven los
  tokens (ver `styles/index.css`). Así los dos modos se revisan sin tocar la
  preferencia real de nadie.

  El `key={seccion}` del contenido es deliberado: obliga a React a remontar
  ese subárbol en cada cambio de sección, que es lo que vuelve a disparar la
  entrada desenfocada. Sin eso las animaciones CSS solo correrían una vez, al
  cargar la página.

  Las dos clases de entrada van en elementos distintos y no juntas en uno: son
  dos `animation` separadas (una anima `filter`, la otra `opacity`) y la forma
  abreviada de CSS solo admite una por elemento — la segunda pisaría a la
  primera. En la referencia también viven separadas.
*/

type Modo = 'claro' | 'oscuro'

const VISTAS: readonly [OpcionDeVista, OpcionDeVista] = [
  { valor: 'columnas', icono: 'view_column', etiqueta: 'Vista de columnas' },
  { valor: 'grilla', icono: 'grid_view', etiqueta: 'Vista de grilla' },
]

const GRUPOS_DEL_DOCK: readonly GrupoDelDock[] = [
  { items: ['Inicio', 'Notas', 'To-do', 'Diario'], navegable: true },
  { rotulo: 'Opciones', items: ['Crear nota', 'Crear carpeta', 'Crear tarea', 'Abrir papelera'] },
]

function Seccion({ titulo, children }: { titulo: string; children: ReactElement | ReactElement[] }): ReactElement {
  return (
    <section className="flex flex-col gap-5">
      <h2 className={`text-xs font-medium tracking-[0.14em] uppercase ${M3_TEXTO_TENUE}`}>{titulo}</h2>
      {children}
    </section>
  )
}

export function PantallaDiseno(): ReactElement {
  const [modo, setModo] = useState<Modo>('oscuro')
  const [seccion, setSeccion] = useState('Inicio')
  /*
    El tipo de modal y si está abierto van por separado a propósito. Con un
    solo `AnclajeDeModal | null`, al cerrar se volvían `null` de golpe todas
    las props que lo describen —disparador, anclaje, ancho— justo mientras
    corría la animación de salida, y esta terminaba encogiéndose hacia el
    botón equivocado.
  */
  const [modal, setModal] = useState<{ tipo: AnclajeDeModal; abierto: boolean }>({
    tipo: 'centro',
    abierto: false,
  })
  const esAnclado = modal.tipo === 'disparador'
  const cerrarModal = (): void => setModal((anterior) => ({ ...anterior, abierto: false }))
  /* Cada botón es el origen del que crece su modal: de ahí salen las medidas del FLIP. */
  const botonAnclado = useRef<HTMLButtonElement>(null)
  const botonCentrado = useRef<HTMLButtonElement>(null)
  /* El área de contenido acota al modal anclado, para que no se monte sobre el dock. */
  const areaDeContenido = useRef<HTMLElement>(null)

  /*
    Armazón de app, no de página: el contenedor ocupa exactamente el alto de
    la ventana y no desborda, así que el documento nunca scrollea. El dock
    queda quieto por construcción —sin `position: fixed`— y lo que se desplaza
    es el contenido, dentro de su propia caja. Misma estructura que la
    referencia, que fija `html { overflow: hidden }`.
  */
  return (
    <div data-tema={modo} className={`lienzo-m3 ${M3_FONDO} flex h-dvh overflow-hidden font-sans`}>
      {/* `flex` para que el dock se estire a lo alto: de eso depende que "Hacer sugerencia" quede anclado abajo. */}
      <div className="dock-entra flex shrink-0 border-r border-[var(--m3-outline-variant)]/40">
        <Dock
          grupos={GRUPOS_DEL_DOCK}
          activo={seccion}
          alCambiar={setSeccion}
          iniciales="J"
          pie="Hacer sugerencia"
        />
      </div>

      <main ref={areaDeContenido} className="flex min-w-0 flex-1 flex-col gap-12 overflow-y-auto p-10">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className={`font-titulo text-[32px] leading-none font-semibold ${M3_TEXTO}`}>Sandbox de diseño</h1>
            <p className={`mt-2 max-w-prose text-base ${M3_TEXTO_TENUE}`}>
              Cambia de sección en el dock para ver la entrada desenfocada, y pasa el mouse por encima de un ítem
              inactivo para ver el rebote.
            </p>
          </div>

          <div className={`${M3_PANEL_ALTO} inline-flex shrink-0 gap-1 rounded-full p-1`}>
            {(['claro', 'oscuro'] as const).map((valor) => (
              <button
                key={valor}
                type="button"
                onClick={() => setModo(valor)}
                aria-pressed={modo === valor}
                className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize ${
                  modo === valor ? `${M3_PRIMARIO_BG} ${M3_PRIMARIO_TEXTO}` : M3_TEXTO_TENUE
                }`}
              >
                {valor}
              </button>
            ))}
          </div>
        </div>

        <div key={seccion} className="entra-con-fundido flex flex-col gap-12">
          <div className="entra-con-desenfoque flex flex-col gap-12">
            <Seccion titulo="Tarjetas">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 [&>*]:min-w-0">
                <TarjetaContorno titulo="Tus tareas">
                  <p className={M3_TEXTO_TENUE}>Contorno: solo el filete de 1px la separa del fondo.</p>
                </TarjetaContorno>
                <TarjetaRellena titulo="Completadas">
                  <p className={M3_TEXTO_TENUE}>Rellena: superficie elevada, sin filete.</p>
                </TarjetaRellena>
                <TarjetaNotaRapida />
              </div>
            </Seccion>

            <Seccion titulo="Píldoras y botones">
              <div className="flex flex-wrap items-center gap-4">
                <PildoraDeBusqueda />
                <SelectorDeVista opciones={VISTAS} />
                <BotonSecundario>Crear tarea</BotonSecundario>
                <BotonPrimario>Crear carpeta</BotonPrimario>
              </div>
            </Seccion>

            <Seccion titulo="Modales">
              <div className="flex flex-wrap items-center gap-4">
                <BotonSecundario
                  ref={botonAnclado}
                  alPulsar={() => setModal({ tipo: 'disparador', abierto: true })}
                >
                  Abrir anclado (como el buscador)
                </BotonSecundario>
                <BotonSecundario ref={botonCentrado} alPulsar={() => setModal({ tipo: 'centro', abierto: true })}>
                  Abrir centrado (como crear carpeta)
                </BotonSecundario>
              </div>
            </Seccion>

            <Seccion titulo="Estado vacío">
              <EstadoVacioIlustrado icono="folder_open" mensaje="Selecciona una nota para comenzar a editarla" />
            </Seccion>

            <Seccion titulo="Escala tipográfica">
              <EscalaTipografica />
            </Seccion>
          </div>
        </div>
      </main>

      {/*
        Los dos casos de la referencia con el mismo componente: el anclado es
        más angosto (400px) y se posa arriba a la derecha, cerca del botón que
        lo abrió; el centrado es de 600px. Todo lo demás es idéntico.
      */}
      <Modal
        abierto={modal.abierto}
        alCerrar={cerrarModal}
        titulo={esAnclado ? 'Buscador' : 'Crear carpeta'}
        anclaje={modal.tipo}
        anclaEn={esAnclado ? botonAnclado : botonCentrado}
        ancho={esAnclado ? 'angosto' : 'normal'}
        limites={areaDeContenido}
      >
        {esAnclado ? (
          <div className="flex items-center gap-3">
            <span className={`flex h-12 flex-1 items-center rounded-full px-5 ${M3_PANEL_ALTO} ${M3_TEXTO_TENUE}`}>
              Buscar en tus notas
            </span>
            <BotonPrimario>Buscar</BotonPrimario>
          </div>
        ) : (
          <>
            <p className={`text-base ${M3_TEXTO_SECUNDARIO}`}>
              Las carpetas agrupan notas por tema. Puedes moverlas después sin perder nada.
            </p>
            <span className={`flex h-14 items-center rounded-2xl px-5 text-lg ${M3_PANEL_ALTO} ${M3_TEXTO_TENUE}`}>
              Nombre de la carpeta
            </span>
            <div className="mt-2 flex items-center justify-end gap-3">
              <BotonSecundario alPulsar={cerrarModal}>Cancelar</BotonSecundario>
              <BotonPrimario>Crear carpeta</BotonPrimario>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
