import { expect, test } from '@playwright/test'

/*
  Criterio de aceptación de F4 (editor de plantillas): un recorrido continuo
  desde "Crear plantilla" hasta ver los cambios reflejados en la tarjeta del
  listado y sobrevivir a un recargado.

  Las plantillas son compartidas entre todo el grupo (no por usuario), pero
  cada prueba de Playwright corre en su propio contexto de navegador con
  almacenamiento aislado, así que no hay colisión con otras specs que
  también usan la cuenta de Camila Zuluaga.

  Credenciales copiadas de `src/features/auth/session/cuentas.fixture.ts`:
  `tsconfig.e2e.json` no tiene el alias `@/`, así que desde aquí no se puede
  importar nada de `src`.
*/
const CUENTA = {
  correo: 'camila.zuluaga@labanfora.org',
  contrasena: 'Simposio-Andes',
}

test('recorrido completo del editor de plantillas', async ({ page }) => {
  const lienzo = page.getByTestId('lienzo-de-plantilla')

  await test.step('acceder y crear una plantilla', async () => {
    await page.goto('/acceso')
    await page.getByLabel('Correo').fill(CUENTA.correo)
    await page.getByLabel('Contraseña').fill(CUENTA.contrasena)
    await page.getByRole('button', { name: 'Acceder' }).click()

    await page.getByRole('link', { name: 'Plantillas' }).click()
    await expect(page).toHaveURL(/\/plantillas$/)

    await page.getByRole('button', { name: 'Crear plantilla' }).click()
    await expect(page).toHaveURL(/\/plantillas\/pla-/)
  })

  await test.step('renombrar la plantilla', async () => {
    const campoNombre = page.getByLabel('Nombre')
    await campoNombre.fill('Plantilla de prueba E2E')
    await expect(campoNombre).toHaveValue('Plantilla de prueba E2E')
  })

  await test.step('agregar un elemento de texto y uno de marcador', async () => {
    await page.getByRole('button', { name: 'Texto' }).click()
    await page.getByRole('button', { name: 'Marcador' }).click()

    await expect(lienzo.getByText('Texto')).toBeVisible()
    await expect(lienzo.getByText(/sesgos algorítmicos/i)).toBeVisible()
  })

  await test.step('subir una imagen', async () => {
    await page.locator('input[type="file"]').setInputFiles('tests/e2e/fixtures/logo-demo.png')

    await expect(lienzo.getByRole('img', { name: 'logo-demo.png' })).toBeVisible()
  })

  await test.step('arrastrar el elemento de texto de verdad, con el puntero', async () => {
    const elementoDeTexto = lienzo.getByText('Texto')
    const cajaAntes = await elementoDeTexto.boundingBox()
    if (cajaAntes === null) throw new Error('no se pudo medir el elemento de texto')

    await page.mouse.move(cajaAntes.x + cajaAntes.width / 2, cajaAntes.y + cajaAntes.height / 2)
    await page.mouse.down()
    await page.mouse.move(cajaAntes.x + cajaAntes.width / 2 + 80, cajaAntes.y + cajaAntes.height / 2 + 80, {
      steps: 10,
    })
    await page.mouse.up()

    await expect
      .poll(async () => (await elementoDeTexto.boundingBox())?.x ?? 0)
      .toBeGreaterThan(cajaAntes.x + 30)
  })

  await test.step('seleccionar el marcador y configurar su campo y formato', async () => {
    await lienzo.getByText(/sesgos algorítmicos/i).click()

    await page.getByLabel('Campo').selectOption('resumen_metodo')
    await page.getByLabel('Formato').selectOption('lista')

    await expect(lienzo.getByRole('list')).toBeVisible()
  })

  await test.step('redimensionar el marcador seleccionado con su mango', async () => {
    const mango = lienzo.getByRole('button', { name: 'Redimensionar' })
    await expect(mango).toBeVisible()

    const cajaMangoAntes = await mango.boundingBox()
    if (cajaMangoAntes === null) throw new Error('no se pudo medir el mango de redimensionar')

    await page.mouse.move(cajaMangoAntes.x, cajaMangoAntes.y)
    await page.mouse.down()
    await page.mouse.move(cajaMangoAntes.x + 70, cajaMangoAntes.y + 70, { steps: 10 })
    await page.mouse.up()

    await expect
      .poll(async () => (await mango.boundingBox())?.x ?? 0)
      .toBeGreaterThan(cajaMangoAntes.x + 20)
  })

  await test.step('quitar el elemento de marcador desde el inspector', async () => {
    await page.getByRole('button', { name: 'Quitar elemento' }).click()

    await expect(lienzo.getByRole('list')).toHaveCount(0)
  })

  await test.step('volver al listado y ver los cambios reflejados en la tarjeta', async () => {
    await page.getByRole('link', { name: 'Volver a plantillas' }).click()
    await expect(page).toHaveURL(/\/plantillas$/)

    await expect(page.getByRole('link', { name: /plantilla de prueba e2e/i })).toBeVisible()
  })

  await test.step('recargar la página conserva la imagen subida', async () => {
    await page.getByRole('link', { name: /plantilla de prueba e2e/i }).click()
    await expect(page).toHaveURL(/\/plantillas\/pla-/)

    await page.reload()

    await expect(page.getByLabel('Nombre')).toHaveValue('Plantilla de prueba E2E')
    await expect(lienzo.getByRole('img', { name: 'logo-demo.png' })).toBeVisible()
  })

  await test.step('eliminar la plantilla desde el listado', async () => {
    page.once('dialog', (dialogo) => void dialogo.accept())
    await page.getByRole('link', { name: 'Volver a plantillas' }).click()

    await page.getByRole('button', { name: /eliminar «plantilla de prueba e2e»/i }).click()

    await expect(page.getByRole('link', { name: /plantilla de prueba e2e/i })).toHaveCount(0)
  })
})
