import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'
import { SessionProvider } from '@/features/auth/session'
import { CLAVE_SESION } from '@/features/auth/session/almacenamiento'
import { mensajeDeError } from '@/shared/errors'
import { PantallaDetalleConferencia } from './PantallaDetalleConferencia'

const ZULUAGA = {
  id: 'usr-zuluaga',
  nombre: 'Camila Zuluaga Nieto',
  correo: 'camila.zuluaga@labanfora.org',
}

const ALCANTARA = {
  id: 'usr-alcantara',
  nombre: 'Valentina Alcántara Rueda',
  correo: 'valentina.alcantara@labanfora.org',
}

function montar(ruta: string, cuenta = ZULUAGA) {
  sessionStorage.setItem(CLAVE_SESION, JSON.stringify(cuenta))

  return render(
    <SessionProvider>
      <MemoryRouter initialEntries={[ruta]}>
        <Routes>
          <Route path="/conferencias" element={<p>Listado de conferencias</p>} />
          <Route path="/conferencias/:idConferencia" element={<PantallaDetalleConferencia />} />
        </Routes>
      </MemoryRouter>
    </SessionProvider>,
  )
}

async function fichas(): Promise<HTMLElement[]> {
  const listado = await screen.findByRole('list', { name: /fichas/i })

  return within(listado).getAllByRole('listitem')
}

/*
  Los conteos usan plural ("Validadas", "Posturas") y las insignias de cada
  ficha usan singular ("Validada", "Postura"), así que buscar por texto exacto
  no confunde el resumen con una fila.
*/
function conteoDe(rotulo: string): HTMLElement | null {
  return screen.getByText(rotulo).closest('div')
}

describe('PantallaDetalleConferencia, resumen', () => {
  it('anuncia la conferencia con su título', async () => {
    montar('/conferencias/cnf-zul-01')

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Calidad de datos en registros administrativos de salud',
      }),
    ).toBeInTheDocument()
  })

  it('muestra ponente, evento, coordenada y duración', async () => {
    montar('/conferencias/cnf-zul-01')

    expect(await screen.findByText('Mariana Escobar Vallejo')).toBeInTheDocument()
    expect(screen.getByText(/Coloquio de Ciencia de Datos del Norte/)).toBeInTheDocument()
    expect(screen.getByText('CCDN-2026-01')).toHaveClass('coordenada')
    expect(screen.getByText('14 may 2026')).toBeInTheDocument()
    expect(screen.getByText('55:20')).toBeInTheDocument()
  })

  it('dice quién compartió una conferencia ajena', async () => {
    montar('/conferencias/cnf-alc-01')

    expect(await screen.findByText(/Compartida por Valentina Alcántara Rueda/)).toBeInTheDocument()
  })

  it('no habla de compartición en una conferencia propia', async () => {
    montar('/conferencias/cnf-zul-01')

    await screen.findByRole('heading', { level: 1 })

    expect(screen.queryByText(/Compartida por/)).not.toBeInTheDocument()
  })

  it('ofrece volver al listado conservando los filtros que había', async () => {
    montar('/conferencias/cnf-zul-01?segmento=propias&orden=titulo-asc')

    const regreso = await screen.findByRole('link', { name: /volver al listado/i })

    expect(regreso).toHaveAttribute('href', expect.stringContaining('segmento=propias'))
    expect(regreso).toHaveAttribute('href', expect.stringContaining('orden=titulo-asc'))
  })
})

describe('PantallaDetalleConferencia, generar memoria', () => {
  it('en una conferencia procesada, ofrece un enlace para generar su memoria', async () => {
    montar('/conferencias/cnf-zul-01')

    const enlace = await screen.findByRole('link', { name: /generar memoria/i })

    expect(enlace).toHaveAttribute('href', '/memorias?conferencia=cnf-zul-01')
  })

  it('en una conferencia sin procesar, no ofrece generar memoria', async () => {
    montar('/conferencias/cnf-pen-02', {
      id: 'usr-penaloza',
      nombre: 'Rodrigo Peñaloza Marín',
      correo: 'rodrigo.penaloza@labanfora.org',
    })

    await screen.findByText(/todavía se está procesando/i)

    expect(screen.queryByRole('link', { name: /generar memoria/i })).not.toBeInTheDocument()
  })
})

describe('PantallaDetalleConferencia, conteos', () => {
  it('reparte las fichas entre los tres estados de validación', async () => {
    montar('/conferencias/cnf-zul-01')

    await screen.findByRole('heading', { level: 1 })

    expect(conteoDe('Validadas')).toHaveTextContent('9')
    expect(conteoDe('Pendientes')).toHaveTextContent('1')
    expect(conteoDe('Automáticas')).toHaveTextContent('2')
  })

  /*
    Un tipo que vale cero es información sobre la charla, no un hueco: dice que
    ahí no se defendió ninguna postura.
  */
  it('declara los seis tipos de unidad aunque alguno valga cero', async () => {
    montar('/conferencias/cnf-alc-03')

    await screen.findByRole('heading', { level: 1 })

    expect(conteoDe('Posturas')).toHaveTextContent('0')
    expect(conteoDe('Citas textuales')).toHaveTextContent('1')
  })
})

describe('PantallaDetalleConferencia, fichas', () => {
  it('lista cada ficha con su coordenada, su tipo y su estado', async () => {
    montar('/conferencias/cnf-zul-01')

    const listadas = await fichas()

    expect(listadas).toHaveLength(12)

    const primera = listadas[0]
    expect(primera).toHaveTextContent('00:03:10')
    expect(primera).toHaveTextContent('Dato de impacto')
    expect(primera).toHaveTextContent('Validada')
  })

  it('muestra la coordenada de la ficha en monoespaciada', async () => {
    montar('/conferencias/cnf-zul-01')
    await fichas()

    expect(screen.getByText('00:03:10')).toHaveClass('coordenada')
  })

  it('reproduce el fragmento tal como se dijo, con su contexto', async () => {
    montar('/conferencias/cnf-zul-01')
    await fichas()

    expect(screen.getByText(/Catorce millones de registros/)).toBeInTheDocument()
  })

  /*
    La opción de privacidad se aplica sobre el dato, y el detalle lo explica en
    vez de callarlo: quien mira tiene que saber que está viendo una parte.
  */
  it('no lista las pendientes cuando la compartición no las incluye, y lo explica', async () => {
    montar('/conferencias/cnf-alc-03')

    const listadas = await fichas()

    expect(listadas).toHaveLength(5)
    expect(screen.getByText(/solo las fichas ya validadas/i)).toBeInTheDocument()
  })

  it('lista las pendientes en una conferencia propia', async () => {
    montar('/conferencias/cnf-alc-03', ALCANTARA)

    expect(await fichas()).toHaveLength(8)
    expect(screen.queryByText(/solo las fichas ya validadas/i)).not.toBeInTheDocument()
  })
})

describe('PantallaDetalleConferencia, estados sin fichas', () => {
  it('explica que una conferencia en proceso todavía no tiene fichas, sin tratarlo como error', async () => {
    montar('/conferencias/cnf-pen-02', {
      id: 'usr-penaloza',
      nombre: 'Rodrigo Peñaloza Marín',
      correo: 'rodrigo.penaloza@labanfora.org',
    })

    expect(await screen.findByText(/todavía se está procesando/i)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('avisa con su código propio cuando el procesamiento se interrumpió', async () => {
    montar('/conferencias/cnf-zul-02')

    const alerta = await screen.findByRole('alert')

    expect(alerta).toHaveTextContent(mensajeDeError('CONF_PROCESAMIENTO_FALLIDO'))
    expect(alerta.textContent).not.toContain('CONF_')
  })
})

describe('PantallaDetalleConferencia, sin acceso', () => {
  it('avisa sin mostrar el código crudo cuando la conferencia no existe', async () => {
    montar('/conferencias/cnf-que-no-existe')

    const alerta = await screen.findByRole('alert')

    expect(alerta).toHaveTextContent(mensajeDeError('CONF_NO_ENCONTRADA'))
    expect(alerta.textContent).not.toContain('CONF_')
  })

  /*
    El corazón de la regla de aislamiento: pedir una conferencia ajena tiene que
    verse exactamente igual que pedir una que no existe, o la pantalla serviría
    para averiguar qué ha subido otra persona.
  */
  it('responde a una conferencia ajena igual que a una inexistente', async () => {
    montar('/conferencias/cnf-ber-02')
    const ajena = (await screen.findByRole('alert')).textContent

    screen.getByRole('link', { name: /volver al listado/i })

    montar('/conferencias/cnf-que-no-existe')
    const inexistentes = await screen.findAllByRole('alert')

    expect(inexistentes.at(-1)?.textContent).toBe(ajena)
  })

  it('deja una salida hacia el listado', async () => {
    montar('/conferencias/cnf-que-no-existe')

    await screen.findByRole('alert')

    expect(screen.getByRole('link', { name: /volver al listado/i })).toBeInTheDocument()
  })
})

describe('PantallaDetalleConferencia, etiquetas', () => {
  it('deja quitar una etiqueta propia', async () => {
    const usuario = userEvent.setup()
    montar('/conferencias/cnf-zul-01')

    await screen.findByRole('heading', { level: 1 })

    const quitar = screen.getByRole('button', { name: /quitar la etiqueta tesis/i })
    await usuario.click(quitar)

    expect(
      screen.queryByRole('button', { name: /quitar la etiqueta tesis/i }),
    ).not.toBeInTheDocument()
  })

  /*
    Las etiquetas que viajaron con la conferencia se ven pero no son de quien
    mira, así que no llevan control de quitar.
  */
  it('muestra sin control de quitar las etiquetas de quien compartió', async () => {
    montar('/conferencias/cnf-alc-01')

    await screen.findByRole('heading', { level: 1 })

    expect(screen.getByText('art1')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /quitar la etiqueta art1/i }),
    ).not.toBeInTheDocument()
  })

  it('no trae las etiquetas del dueño cuando la compartición no las incluye', async () => {
    montar('/conferencias/cnf-alc-03')

    await screen.findByRole('heading', { level: 1 })

    /* Alcántara tiene "IA" sobre esta conferencia, pero no la compartió. */
    expect(screen.queryByText('IA')).not.toBeInTheDocument()
  })
})
