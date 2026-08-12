import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

/*
  Criterio de aceptación de F2: un solo recorrido continuo por el dashboard,
  desde entrar hasta volver del detalle con los filtros intactos.

  Camila Zuluaga es la cuenta de este recorrido porque es la única que ve las
  dos procedencias a la vez, tres conferencias propias y cuatro compartidas.
  Alcántara y Berrío ya están tomadas por las specs de F1 y `fullyParallel`
  está activo, así que dos specs no pueden compartir cuenta.

  Las credenciales se copian de `src/features/auth/session/cuentas.fixture.ts`:
  `tsconfig.e2e.json` no tiene el alias `@/`, así que desde aquí no se puede
  importar nada de `src`.

  Estado y etiquetas viven detrás de un botón "Filtros" que alterna abierto y
  cerrado: elegir un radio de estado o una casilla de etiqueta no lo cierra
  (para poder ajustar varios filtros seguidos sin reabrir), pero el chip
  "Nueva etiqueta" sí lo cierra al abrir el diálogo de creación. Cada paso dice
  explícitamente cuándo abre y cuándo cierra el panel, para no depender de en
  qué estado lo dejó el paso anterior.
*/
const CUENTA = {
  correo: 'camila.zuluaga@labanfora.org',
  contrasena: 'Simposio-Andes',
}

async function acceder(page: Page): Promise<void> {
  await page.goto('/acceso')
  await page.getByLabel('Correo').fill(CUENTA.correo)
  await page.getByLabel('Contraseña').fill(CUENTA.contrasena)
  await page.getByRole('button', { name: 'Acceder' }).click()
  await expect(page).toHaveURL(/\/conferencias$/)
}

test('recorrido completo del dashboard de conferencias', async ({ page }) => {
  const listado = page.getByRole('list', { name: 'Conferencias' })
  const filas = listado.getByRole('listitem')
  const navegacion = page.getByRole('navigation', { name: 'Secciones de Bitácora AI' })
  const botonDeFiltros = page.getByRole('button', { name: 'Filtros' })

  await test.step('entrar deja el listado completo a la vista', async () => {
    await acceder(page)

    await expect(filas).toHaveCount(7)
    await expect(page.getByText('7 conferencias a la vista')).toBeVisible()
  })

  await test.step('cada fila trae su coordenada de charla', async () => {
    await expect(page.getByText('CCDN-2026-01')).toBeVisible()
    await expect(filas.first()).toContainText('may 2026')
  })

  await test.step('el origen propio deja tres filas y viaja a la URL', async () => {
    await page.getByRole('radio', { name: 'Mías' }).click()

    await expect(page).toHaveURL(/segmento=propias$/)
    await expect(filas).toHaveCount(3)
  })

  await test.step('el origen compartido deja cuatro filas y nombra a quien compartió', async () => {
    await page.getByRole('radio', { name: 'Compartidas conmigo' }).click()

    await expect(filas).toHaveCount(4)
    await expect(filas.first()).toContainText('Compartida por')
  })

  await test.step('buscar por ponente acota el listado y sobrevive a un recargado', async () => {
    await page.getByRole('radio', { name: 'Todas' }).click()
    await expect(filas).toHaveCount(7)

    await page.getByLabel(/Buscar por conferencia/).fill('Escobar')

    await expect(filas).toHaveCount(2)

    await page.reload()

    await expect(page.getByLabel(/Buscar por conferencia/)).toHaveValue('Escobar')
    await expect(filas).toHaveCount(2)
  })

  await test.step('el panel de filtros deja solo las conferencias procesadas', async () => {
    await page.getByLabel(/Buscar por conferencia/).fill('')
    await expect(filas).toHaveCount(7)

    await botonDeFiltros.click()
    await page.getByRole('radio', { name: 'Procesada' }).click()

    await expect(filas).toHaveCount(6)
    await expect(botonDeFiltros).toContainText('1')

    await page.keyboard.press('Escape')
  })

  await test.step('una etiqueta creada al vuelo desde el diálogo sirve para filtrar', async () => {
    await botonDeFiltros.click()
    await page.getByRole('radio', { name: 'Cualquier estado' }).click()
    await expect(filas).toHaveCount(7)

    await page.getByRole('button', { name: /nueva etiqueta/i }).click()

    const dialogo = page.getByRole('dialog')
    await expect(dialogo).toBeVisible()

    await page.getByLabel('Nombre').fill('art2')
    await page.getByRole('button', { name: 'Crear' }).click()

    await expect(dialogo).toBeHidden()

    await botonDeFiltros.click()
    await expect(page.getByRole('checkbox', { name: 'art2' })).toBeVisible()

    await page.getByRole('checkbox', { name: 'revisión 2026' }).click()

    await expect(filas).toHaveCount(1)

    await page.keyboard.press('Escape')
  })

  await test.step('"Quitar todas" limpia de un tajo las etiquetas seleccionadas', async () => {
    await botonDeFiltros.click()

    await expect(page.getByRole('button', { name: 'Quitar todas' })).toBeVisible()
    await page.getByRole('button', { name: 'Quitar todas' }).click()

    await expect(filas).toHaveCount(7)
    await expect(botonDeFiltros).toHaveText('Filtros')

    await page.keyboard.press('Escape')
  })

  await test.step('una combinación imposible muestra el vacío de filtros', async () => {
    await page.getByLabel(/Buscar por conferencia/).fill('termodinámica cuántica')

    await expect(page.getByText(/Ningún resultado con estos filtros/)).toBeVisible()

    await page.getByRole('button', { name: 'Quitar filtros' }).click()

    await expect(page).toHaveURL(/\/conferencias$/)
    await expect(filas).toHaveCount(7)
  })

  await test.step('abrir una conferencia lleva a su detalle con sus fichas', async () => {
    await page.getByRole('radio', { name: 'Mías' }).click()
    await expect(filas).toHaveCount(3)

    await page.getByRole('link', { name: /Calidad de datos en registros administrativos/ }).click()

    await expect(page).toHaveURL(/\/conferencias\/cnf-zul-01/)
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'Calidad de datos en registros administrativos de salud',
      }),
    ).toBeVisible()

    const fichas = page.getByRole('list', { name: 'Fichas de la conferencia' })
    await expect(fichas.getByRole('listitem')).toHaveCount(12)
    await expect(page.getByText('00:03:10')).toBeVisible()
  })

  /*
    El detalle no tiene sección propia en el índice, así que la de origen tiene
    que seguir marcada. `exact` es obligatorio: "Conferencias" es prefijo de
    "Cargar conferencia".
  */
  await test.step('el índice sigue señalando la sección de origen', async () => {
    await expect(navegacion.getByRole('link', { name: 'Conferencias', exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    )
    await expect(
      navegacion.getByRole('link', { name: 'Cargar conferencia' }),
    ).not.toHaveAttribute('aria-current', 'page')
  })

  await test.step('volver al listado conserva los filtros que había', async () => {
    await page.getByRole('link', { name: 'Volver al listado' }).click()

    await expect(page).toHaveURL(/segmento=propias$/)
    await expect(page.getByRole('radio', { name: 'Mías' })).toBeChecked()
  })

  /*
    Las dos últimas comprobaciones son la regla de aislamiento vista desde
    fuera: una conferencia ajena tiene que responder exactamente igual que una
    que no existe.
  */
  await test.step('una conferencia inexistente avisa sin filtrar el código', async () => {
    await page.goto('/conferencias/cnf-que-no-existe')

    const alerta = page.getByRole('alert')
    await expect(alerta).toBeVisible()
    await expect(alerta).not.toContainText('CONF_')
  })

  await test.step('una conferencia ajena responde igual que una inexistente', async () => {
    await page.goto('/conferencias/cnf-que-no-existe')
    const inexistente = await page.getByRole('alert').textContent()

    await page.goto('/conferencias/cnf-ber-02')

    await expect(page.getByRole('alert')).toHaveText(inexistente ?? '')
  })
})

test('ocultar una conferencia la saca del listado sin borrarla del todo', async ({ page }) => {
  const filas = page.getByRole('list', { name: 'Conferencias' }).getByRole('listitem')

  await acceder(page)
  await expect(filas).toHaveCount(7)

  const primeraFila = filas.first()
  const enlace = primeraFila.getByRole('link')
  const titulo = (await enlace.textContent()) ?? ''
  const href = await enlace.getAttribute('href')

  await primeraFila.getByRole('button', { name: /quitar «.*» de tu listado/i }).click()

  await expect(filas).toHaveCount(6)
  await expect(page.getByText(titulo, { exact: true })).toHaveCount(0)

  /* Es una preferencia de vista, no un borrado real: sigue accesible por su URL. */
  await page.goto(href ?? '')
  await expect(page.getByRole('heading', { level: 1, name: titulo })).toBeVisible()
})
