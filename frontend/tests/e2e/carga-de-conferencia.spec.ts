import { expect, test } from '@playwright/test'

/*
  Criterio de aceptación de F3 (rediseño con directorio de eventos y
  ponentes): un recorrido continuo por el formulario, desde el error de
  campos vacíos hasta la confirmación, pasando por crear un evento y un
  ponente al vuelo.

  F3 sigue siendo una pantalla aislada (PRD.md sección 6, PLAN.md sección 7):
  lo cargado no se persiste ni se integra al dashboard, así que esta spec no
  toca ningún estado compartido con otras pruebas. Se reutiliza la cuenta de
  Camila Zuluaga sin riesgo de colisión bajo `fullyParallel` por esa misma
  razón.

  Credenciales copiadas de `src/features/auth/session/cuentas.fixture.ts`:
  `tsconfig.e2e.json` no tiene el alias `@/`, así que desde aquí no se puede
  importar nada de `src`.
*/
const CUENTA = {
  correo: 'camila.zuluaga@labanfora.org',
  contrasena: 'Simposio-Andes',
}

test('recorrido completo de la carga de conferencia', async ({ page }) => {
  const selectorDeEvento = page.getByLabel('Evento', { exact: true })
  const selectorDePonente = page.getByLabel('Ponente', { exact: true })

  await test.step('acceder y navegar a "Cargar conferencia"', async () => {
    await page.goto('/acceso')
    await page.getByLabel('Correo').fill(CUENTA.correo)
    await page.getByLabel('Contraseña').fill(CUENTA.contrasena)
    await page.getByRole('button', { name: 'Acceder' }).click()
    await expect(page).toHaveURL(/\/conferencias$/)

    await page.getByRole('link', { name: 'Cargar conferencia' }).click()
    await expect(page).toHaveURL(/\/conferencias\/nueva$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Cargar conferencia' })).toBeVisible()
  })

  await test.step('enviar el formulario vacío muestra un error por cada campo sin completar', async () => {
    await page.getByRole('button', { name: 'Cargar conferencia' }).click()

    await expect(page.getByRole('alert').first()).toBeVisible()
    await expect(selectorDeEvento).toHaveAttribute('aria-invalid', 'true')
    await expect(page).toHaveURL(/\/conferencias\/nueva$/)
  })

  await test.step('el selector de ponente empieza deshabilitado', async () => {
    await expect(selectorDePonente).toBeDisabled()
  })

  await test.step('crear un evento nuevo al vuelo lo deja elegido y habilita el de ponente', async () => {
    await selectorDeEvento.selectOption({ label: '+ Crear evento nuevo…' })

    const dialogo = page.getByRole('dialog')
    await expect(dialogo).toBeVisible()

    await dialogo.getByLabel('Nombre').fill('Encuentro de Prueba E2E')
    await dialogo.getByRole('button', { name: 'Crear' }).click()

    await expect(dialogo).toBeHidden()
    await expect(selectorDeEvento).toHaveValue(/encuentro-de-prueba-e2e/)
    await expect(selectorDePonente).toBeEnabled()
  })

  await test.step('crear un ponente nuevo al vuelo lo deja elegido', async () => {
    await selectorDePonente.selectOption({ label: '+ Crear ponente nuevo…' })

    const dialogo = page.getByRole('dialog')
    await expect(dialogo).toBeVisible()

    await dialogo.getByLabel('Nombre').fill('Ponente de Prueba')
    await dialogo.getByRole('button', { name: 'Crear' }).click()

    await expect(dialogo).toBeHidden()
    await expect(selectorDePonente.locator('option:checked')).toHaveText('Ponente de Prueba')
  })

  await test.step('la vista previa refleja el evento y el ponente elegidos', async () => {
    const vistaPrevia = page.getByRole('complementary', { name: 'Vista previa' })

    await expect(vistaPrevia.getByText('Encuentro de Prueba E2E')).toBeVisible()
    await expect(vistaPrevia.getByText('Ponente de Prueba')).toBeVisible()
  })

  await test.step('completar los datos y adjuntar la extensión equivocada muestra el error de formato', async () => {
    await page.getByLabel('Título').fill('Charla de prueba end to end')
    await page.getByLabel('Fecha del evento').fill('2026-05-14')

    await expect(page.getByRole('radio', { name: 'Audio' })).toBeChecked()

    await page
      .getByLabel('Archivo', { exact: true })
      .setInputFiles('tests/e2e/fixtures/transcripcion-demo.txt')

    await page.getByRole('button', { name: 'Cargar conferencia' }).click()

    await expect(page.getByRole('alert')).toContainText(/formato admitido/i)
  })

  await test.step('adjuntar el archivo correcto y enviar muestra la confirmación con nombres, no ids', async () => {
    await page.getByLabel('Archivo', { exact: true }).setInputFiles('tests/e2e/fixtures/charla-demo.mp3')

    const boton = page.getByRole('button', { name: 'Cargar conferencia' })
    await boton.click()
    await expect(boton).toHaveAttribute('aria-busy', 'true')

    /*
      "Charla de prueba end to end" y los nombres de evento/ponente también
      aparecen en la vista previa mientras el formulario sigue visible, así
      que no sirven para esperar la confirmación: se espera "Cargar otra
      conferencia", que solo existe una vez confirmada.
    */
    await expect(page.getByRole('button', { name: 'Cargar otra conferencia' })).toBeVisible()

    await expect(page.getByText(/Charla de prueba end to end/)).toBeVisible()
    await expect(page.getByText('Encuentro de Prueba E2E')).toBeVisible()
    await expect(page.getByText('Ponente de Prueba')).toBeVisible()
    await expect(page.getByLabel('Título')).toHaveCount(0)
  })

  await test.step('volver a Conferencias no muestra la conferencia recién cargada', async () => {
    await page.getByRole('link', { name: 'Ver mis conferencias' }).click()

    await expect(page).toHaveURL(/\/conferencias$/)
    await expect(page.getByText('Charla de prueba end to end')).toHaveCount(0)
  })
})
