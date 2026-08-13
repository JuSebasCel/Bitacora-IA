import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

/*
  Criterio de aceptación de F5 (generador de memoria): elegir una conferencia
  ya procesada y una plantilla guardada, generar la memoria y ver su vista
  previa con los datos reales de esa conferencia sustituidos — nunca los
  datos de ejemplo genéricos, salvo en los marcadores de etiqueta
  personalizada (decisión de alcance del módulo, ver el plan).

  Valentina Alcántara es la cuenta de este recorrido: es la dueña de
  `cnf-alc-01` ("Modelos de lenguaje aplicados a la revisión sistemática de
  literatura"), la conferencia procesada que también usa la semilla de
  `MEMORIAS_DE_EJEMPLO`.

  Credenciales copiadas de `src/features/auth/session/cuentas.fixture.ts`:
  `tsconfig.e2e.json` no tiene el alias `@/`, así que desde aquí no se puede
  importar nada de `src`.
*/
const CUENTA = {
  correo: 'valentina.alcantara@labanfora.org',
  contrasena: 'Anfora-2026',
}

const RUTA_DOCX_DE_EJEMPLO = '../.agent/examples/tem.docx'

/*
  Las dos pruebas de este archivo son pesadas (JSZip/docx-templates de
  verdad), y correrlas en paralelo entre sí competía por CPU en esta máquina
  al punto de hacer que la importación del `.docx` real superara los 15 s —
  no era un error real de la app, solo contención (confirmado: la misma
  importación corre en menos de 1 s cuando el resto de la máquina no compite
  por CPU en ese instante). `mode: 'serial'` las corre una detrás de otra
  dentro de este archivo, y `retries` es la red de seguridad para el pico
  ocasional de contención que ni siquiera el modo serial evita del todo —
  ninguno de los dos toca la configuración global de la suite.
*/
test.describe.configure({ mode: 'serial', retries: 2 })

async function acceder(page: Page): Promise<void> {
  await page.goto('/acceso')
  await page.getByLabel('Correo').fill(CUENTA.correo)
  await page.getByLabel('Contraseña').fill(CUENTA.contrasena)
  await page.getByRole('button', { name: 'Acceder' }).click()
  await expect(page).toHaveURL(/\/conferencias$/)
}

test('generar una memoria en blanco desde el detalle de una conferencia, verla y eliminarla', async ({ page }) => {
  const panel = page.getByRole('dialog', { name: 'Generar memoria' })

  await test.step('desde el detalle de una conferencia procesada, "Generar memoria" abre el panel con esa conferencia preseleccionada', async () => {
    await acceder(page)
    await page.getByRole('link', { name: /modelos de lenguaje aplicados/i }).click()
    await expect(page).toHaveURL(/\/conferencias\/cnf-alc-01/)

    await page.getByRole('link', { name: 'Generar memoria' }).click()

    await expect(page).toHaveURL(/\/memorias\?conferencia=cnf-alc-01/)
    await expect(panel).toBeVisible()
    await expect(panel.getByLabel('Conferencia')).toHaveValue('cnf-alc-01')
  })

  await test.step('elegir una plantilla en blanco y generar deja la memoria en el listado', async () => {
    await panel.getByLabel('Plantilla').selectOption({ label: 'Memoria estándar' })
    await expect(panel.getByLabel('Nombre')).toHaveValue(/Modelos de lenguaje/)

    await panel.getByRole('button', { name: 'Generar memoria' }).click()

    await expect(panel).toBeHidden()
    /*
      La semilla de `MEMORIAS_DE_EJEMPLO` ya trae una memoria con el mismo
      nombre (misma conferencia + misma plantilla) — la recién creada es la
      última en la lista, porque `useMemorias().generar` la agrega al final.
    */
    const tarjeta = page.getByRole('link', { name: /memoria de modelos de lenguaje/i }).last()
    await expect(tarjeta).toBeVisible()
  })

  let idDeLaNueva = ''

  await test.step('abrir la memoria muestra la vista previa con el dato real de la conferencia', async () => {
    await page.getByRole('link', { name: /memoria de modelos de lenguaje/i }).last().click()
    await expect(page).toHaveURL(/\/memorias\/mem-/)
    idDeLaNueva = new URL(page.url()).pathname.replace('/memorias/', '')

    /* «Modelos de lenguaje» es el tema real de cnf-alc-01 — el dato de ejemplo genérico es «Sesgos algorítmicos…». */
    await expect(page.getByText('Modelos de lenguaje', { exact: true })).toBeVisible()
  })

  await test.step('eliminar la memoria desde el listado', async () => {
    page.once('dialog', (dialogo) => void dialogo.accept())
    await page.getByRole('link', { name: 'Volver a memorias' }).click()

    /*
      La semilla comparte el mismo nombre visible que la memoria recién
      creada (misma conferencia + plantilla): se ubica la tarjeta por su
      enlace exacto (id capturado al abrirla) para borrar solo esa.
    */
    const tarjeta = page.locator('li').filter({ has: page.locator(`a[href="/memorias/${idDeLaNueva}"]`) })
    await tarjeta.getByRole('button', { name: /eliminar/i }).click()

    await expect(page.locator(`a[href="/memorias/${idDeLaNueva}"]`)).toHaveCount(0)
  })
})

test('importar una plantilla .docx real, generar una memoria con ella y descargarla', async ({ page }) => {
  const panel = page.getByRole('dialog', { name: 'Generar memoria' })

  await test.step('importar el .docx de ejemplo como plantilla nueva', async () => {
    await acceder(page)
    await page.getByRole('link', { name: 'Plantillas' }).click()
    await expect(page).toHaveURL(/\/plantillas$/)

    await page.locator('input[type="file"]').setInputFiles(RUTA_DOCX_DE_EJEMPLO)
    await expect(page).toHaveURL(/\/plantillas\/pla-/, { timeout: 15_000 })

    await page.locator('#plantilla-nombre').fill('Plantilla docx para memoria E2E')
    await page.getByRole('link', { name: 'Volver a plantillas' }).click()
    await expect(page).toHaveURL(/\/plantillas$/)
  })

  await test.step('generar una memoria con esa plantilla desde Memorias', async () => {
    await page.getByRole('link', { name: 'Memorias' }).click()
    await expect(page).toHaveURL(/\/memorias$/)

    await page.getByRole('button', { name: 'Generar memoria' }).click()
    await expect(panel).toBeVisible()

    await panel.getByLabel('Conferencia').selectOption({
      label: 'Modelos de lenguaje aplicados a la revisión sistemática de literatura',
    })
    await panel.getByLabel('Plantilla').selectOption({ label: 'Plantilla docx para memoria E2E' })
    await panel.getByLabel('Nombre').fill('Memoria docx E2E')

    await panel.getByRole('button', { name: 'Generar memoria' }).click()
    await expect(panel).toBeHidden()
  })

  await test.step('la vista previa del origen .docx ofrece una descarga real', async () => {
    await page.getByRole('link', { name: 'Memoria docx E2E' }).click()
    await expect(page).toHaveURL(/\/memorias\/mem-/)

    const enlace = page.getByRole('link', { name: 'Descargar memoria' })
    await expect(enlace).toBeVisible()
    await expect(enlace).toHaveAttribute('download', 'Memoria docx E2E.docx')
  })

  await test.step('eliminar la memoria y la plantilla usadas en esta prueba', async () => {
    page.once('dialog', (dialogo) => void dialogo.accept())
    await page.getByRole('link', { name: 'Volver a memorias' }).click()
    await page.getByRole('button', { name: /eliminar «memoria docx e2e»/i }).click()
    await expect(page.getByRole('link', { name: 'Memoria docx E2E' })).toHaveCount(0)

    await page.getByRole('link', { name: 'Plantillas' }).click()
    page.once('dialog', (dialogo) => void dialogo.accept())
    await page.getByRole('button', { name: /eliminar «plantilla docx para memoria e2e»/i }).click()
    await expect(page.getByRole('link', { name: 'Plantilla docx para memoria E2E' })).toHaveCount(0)
  })
})
