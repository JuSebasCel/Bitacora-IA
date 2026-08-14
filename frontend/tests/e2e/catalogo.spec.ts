import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

/*
  Criterio de aceptación de F6 (catálogo con filtros): filtrar las fichas de
  todas las conferencias visibles por tema, tipo de unidad, evento, palabra
  clave y estado de validación, combinarlos entre sí, y abrir un resultado
  hacia la conferencia de donde viene.

  Camila Zuluaga es la cuenta de este recorrido: ve las dos procedencias a la
  vez (tres conferencias propias y cuatro compartidas), así que el catálogo
  reúne fichas de ambas y no solo de una.

  Cuenta real de Supabase Auth (B1), con el mismo UUID que ya usan los
  fixtures de conferencias/fichas. Los números esperados (46 fichas en total, 5 con el tema "Sesgos
  algorítmicos", 12 en "Jornadas de Ingeniería y Sociedad", 9 al combinar ese
  evento con "Validada", 7 de tipo "Cita textual") se calcularon corriendo
  `fichasDelCatalogo`/`filtrarPor*` sobre el fixture real para esta cuenta,
  no a mano — si el fixture cambia, esta prueba hay que recalcularla igual.

  `tsconfig.e2e.json` no tiene el alias `@/`, así que desde aquí no se puede
  importar nada de `src`.
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

test('recorrido completo del catálogo con filtros', async ({ page }) => {
  const resultados = page.getByRole('list', { name: 'Catálogo' }).getByRole('listitem')
  const botonDeFiltros = page.getByRole('button', { name: 'Filtros' })

  await test.step('entrar al catálogo desde la navegación deja todas las fichas visibles', async () => {
    await acceder(page)
    await page.getByRole('link', { name: 'Catálogo' }).click()

    await expect(page).toHaveURL(/\/catalogo$/)
    await expect(resultados).toHaveCount(46)
    await expect(page.getByText('46 fichas a la vista')).toBeVisible()
  })

  await test.step('filtrar por tema acota el listado y lo deja en la URL', async () => {
    await botonDeFiltros.click()
    await page.getByRole('radio', { name: 'Sesgos algorítmicos' }).click()

    await expect(page).toHaveURL(/tema=/)
    await expect(resultados).toHaveCount(5)
    await expect(botonDeFiltros).toContainText('1')

    await page.keyboard.press('Escape')
  })

  await test.step('volver a "Todos los temas" restablece el listado completo', async () => {
    await botonDeFiltros.click()
    await page.getByRole('radio', { name: 'Todos los temas' }).click()

    await expect(resultados).toHaveCount(46)
    await page.keyboard.press('Escape')
  })

  await test.step('filtrar por evento acota el listado', async () => {
    await botonDeFiltros.click()
    await page.getByRole('radio', { name: 'Jornadas de Ingeniería y Sociedad' }).click()

    await expect(resultados).toHaveCount(12)
    await page.keyboard.press('Escape')
  })

  await test.step('combinar evento y estado de validación acota más todavía', async () => {
    await botonDeFiltros.click()
    await page.getByRole('radio', { name: 'Validada' }).click()

    await expect(resultados).toHaveCount(9)
    await expect(botonDeFiltros).toContainText('2')
    await page.keyboard.press('Escape')
  })

  await test.step('filtrar por tipo de unidad reemplaza el criterio anterior sin acumular', async () => {
    await botonDeFiltros.click()
    await page.getByRole('radio', { name: 'Cualquier estado' }).click()
    await page.getByRole('radio', { name: 'Todos los eventos' }).click()
    await page.getByRole('radio', { name: 'Cita textual' }).click()

    await expect(resultados).toHaveCount(7)
    await expect(botonDeFiltros).toContainText('1')
    await page.keyboard.press('Escape')
  })

  await test.step('quitar el filtro de tipo y buscar por palabra clave acota por fragmento y tema', async () => {
    await botonDeFiltros.click()
    await page.getByRole('radio', { name: 'Todos los tipos' }).click()
    await expect(botonDeFiltros).toHaveText('Filtros')
    await page.keyboard.press('Escape')

    await page.getByLabel(/buscar por fragmento, tema, conferencia o ponente/i).fill('algoritmicos')

    await expect(resultados).toHaveCount(5)
    await expect(page).toHaveURL(/buscar=algoritmicos/)
  })

  await test.step('una búsqueda que solo aparece en el fragmento también encuentra la ficha', async () => {
    await page.getByLabel(/buscar por fragmento, tema, conferencia o ponente/i).fill('catorce')

    await expect(resultados).toHaveCount(1)
    await expect(page.getByText(/Catorce millones de registros/)).toBeVisible()
  })

  await test.step('abrir un resultado lleva a la conferencia de origen', async () => {
    await resultados.first().getByRole('link').click()

    await expect(page).toHaveURL(/\/conferencias\/cnf-zul-01/)
    await expect(
      page.getByRole('heading', { level: 1, name: 'Calidad de datos en registros administrativos de salud' }),
    ).toBeVisible()
  })

  await test.step('una combinación imposible muestra el vacío de filtros, y "Quitar filtros" lo restablece', async () => {
    await page.goBack()
    await expect(page).toHaveURL(/\/catalogo/)

    await page.getByLabel(/buscar por fragmento, tema, conferencia o ponente/i).fill('termodinámica cuántica')

    await expect(page.getByText(/Ningún resultado con estos filtros/)).toBeVisible()

    await page.getByRole('button', { name: 'Quitar filtros' }).click()

    await expect(page).toHaveURL(/\/catalogo$/)
    await expect(resultados).toHaveCount(46)
  })
})
