import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

/*
  Criterio de aceptación de F4 (editor de plantillas), tras el pivote a
  "documento en flujo" con TipTap y a plantillas `.docx` conservadas
  intactas: dos recorridos completos, uno por cada origen posible.

  Las plantillas son compartidas entre todo el grupo (no por usuario), pero
  cada prueba de Playwright corre en su propio contexto de navegador con
  almacenamiento aislado, así que no hay colisión entre pruebas ni con otras
  specs que también usan la cuenta de Camila Zuluaga.

  Cuenta real de Supabase Auth (B1), con el mismo UUID que ya usan los
  fixtures de conferencias/fichas. `tsconfig.e2e.json` no tiene el alias
  `@/`, así que desde aquí no se puede importar nada de `src`. La ruta al
  `.docx` de ejemplo es relativa a
  `frontend/` (cwd de Playwright), igual que en `importarDocx.test.ts`.
*/
const CUENTA = {
  correo: 'camila.zuluaga@labanfora.org',
  contrasena: 'Simposio-Andes',
}

const RUTA_DOCX_DE_EJEMPLO = '../.agent/examples/tem.docx'

async function acceder(page: Page): Promise<void> {
  await page.goto('/acceso')
  await page.getByLabel('Correo').fill(CUENTA.correo)
  await page.getByLabel('Contraseña').fill(CUENTA.contrasena)
  await page.getByRole('button', { name: 'Acceder' }).click()
  await expect(page).toHaveURL(/\/conferencias$/)

  await page.getByRole('link', { name: 'Plantillas' }).click()
  await expect(page).toHaveURL(/\/plantillas$/)
}

test('recorrido completo de una plantilla en blanco', async ({ page }) => {
  await test.step('crear una plantilla en blanco navega directo a su editor', async () => {
    await acceder(page)

    await page.getByRole('button', { name: 'Crear plantilla' }).click()
    await expect(page).toHaveURL(/\/plantillas\/pla-/)
    await expect(page.locator('#plantilla-nombre')).toHaveValue('Plantilla sin nombre')
  })

  await test.step('renombrar y escribir contenido con la barra de herramientas', async () => {
    const campoNombre = page.locator('#plantilla-nombre')
    await campoNombre.fill('Memoria de cierre E2E')
    await expect(campoNombre).toHaveValue('Memoria de cierre E2E')

    await page.locator('.ProseMirror').click()
    await page.keyboard.type('Resumen del evento:')
  })

  await test.step('insertar un marcador desde la paleta con un clic', async () => {
    await page.getByRole('button', { name: 'Nombre del ponente' }).click()

    await expect(page.locator('.ProseMirror')).toContainText('Nombre del ponente')
  })

  await test.step('volver al listado deja los cambios reflejados en la tarjeta', async () => {
    await page.getByRole('button', { name: 'Volver a plantillas' }).click()
    await expect(page).toHaveURL(/\/plantillas$/)

    await expect(page.getByRole('link', { name: /memoria de cierre e2e/i })).toBeVisible()
  })

  await test.step('recargar conserva el nombre y el marcador insertado', async () => {
    await page.getByRole('link', { name: /memoria de cierre e2e/i }).click()
    await expect(page).toHaveURL(/\/plantillas\/pla-/)

    await page.reload()

    await expect(page.locator('#plantilla-nombre')).toHaveValue('Memoria de cierre E2E')
    await expect(page.locator('.ProseMirror')).toContainText('Nombre del ponente')
  })

  await test.step('eliminar la plantilla desde el listado', async () => {
    page.once('dialog', (dialogo) => void dialogo.accept())
    await page.getByRole('button', { name: 'Volver a plantillas' }).click()

    await page.getByRole('button', { name: /eliminar «memoria de cierre e2e»/i }).click()

    await expect(page.getByRole('link', { name: /memoria de cierre e2e/i })).toHaveCount(0)
  })
})

test('una plantilla en blanco abandonada sin tocar nada no se guarda', async ({ page }) => {
  await acceder(page)
  const listado = page.getByRole('list', { name: 'Plantillas' }).getByRole('listitem')
  await expect(listado.first()).toBeVisible()
  const conteoInicial = await listado.count()

  await page.getByRole('button', { name: 'Crear plantilla' }).click()
  await expect(page).toHaveURL(/\/plantillas\/pla-/)

  await page.getByRole('button', { name: 'Volver a plantillas' }).click()

  await expect(page).toHaveURL(/\/plantillas$/)
  await expect(listado).toHaveCount(conteoInicial)
  await expect(page.getByText('Plantilla sin nombre')).toHaveCount(0)
})

test('importar un .docx real lo conserva intacto y solo confirma sus marcas', async ({ page }) => {
  await test.step('importar el archivo navega directo a la confirmación de solo lectura', async () => {
    await acceder(page)

    await page.locator('input[type="file"]').setInputFiles(RUTA_DOCX_DE_EJEMPLO)

    await expect(page).toHaveURL(/\/plantillas\/pla-/, { timeout: 15_000 })
    await expect(page.locator('#plantilla-nombre')).toHaveValue('tem')
  })

  await test.step('cada marca se ve con su contexto de párrafo, sin corchetes, y no hay ningún campo para llenar', async () => {
    /*
      Se acota a la sección de marcadores detectados: el documento original
      renderizado abajo (`VistaPreviaDeDocx`) sí conserva sus corchetes
      literales — el archivo nunca se toca — así que buscar "[[" en toda la
      página también encontraría ese texto legítimo del documento real.
    */
    const seccionDeMarcadores = page.locator('section', { has: page.getByText(/marcadores detectados/i) })
    await expect(seccionDeMarcadores).toBeVisible()
    await expect(seccionDeMarcadores.getByText('[[', { exact: false })).toHaveCount(0)
    await expect(page.getByRole('combobox')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /generar vista previa/i })).toHaveCount(0)
  })

  await test.step('descargar entrega el archivo original, no uno generado', async () => {
    const enlace = page.getByRole('link', { name: 'Descargar plantilla' })
    await expect(enlace).toBeVisible()
    await expect(enlace).toHaveAttribute('download', /\.docx$/)
  })

  await test.step('renombrar y volver deja la miniatura real del documento en la tarjeta del listado', async () => {
    await page.locator('#plantilla-nombre').fill('Plantilla docx E2E')
    await page.getByRole('link', { name: 'Volver a plantillas' }).click()

    await expect(page).toHaveURL(/\/plantillas$/)
    const tarjeta = page.getByRole('link', { name: /plantilla docx e2e/i })
    await expect(tarjeta).toBeVisible()
    await expect(tarjeta.locator('.vista-previa-docx')).toBeAttached()
  })

  await test.step('eliminar la plantilla importada desde el listado', async () => {
    page.once('dialog', (dialogo) => void dialogo.accept())
    await page.getByRole('button', { name: /eliminar «plantilla docx e2e»/i }).click()

    await expect(page.getByRole('link', { name: /plantilla docx e2e/i })).toHaveCount(0)
  })
})
