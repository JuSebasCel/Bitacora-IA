import { expect, test } from '@playwright/test'

/*
  Criterio de aceptación de F3: un recorrido continuo por el formulario de
  carga, desde el error de campos vacíos hasta la confirmación.

  F3 es una pantalla aislada (PRD.md sección 6, PLAN.md sección 7): lo cargado
  no se persiste ni se integra al dashboard, así que esta spec no toca ningún
  estado compartido con otras pruebas. Se reutiliza la cuenta de Camila
  Zuluaga sin riesgo de colisión bajo `fullyParallel` por esa misma razón.

  Credenciales copiadas de `src/features/auth/session/cuentas.fixture.ts`:
  `tsconfig.e2e.json` no tiene el alias `@/`, así que desde aquí no se puede
  importar nada de `src`.
*/
const CUENTA = {
  correo: 'camila.zuluaga@labanfora.org',
  contrasena: 'Simposio-Andes',
}

test('recorrido completo de la carga de conferencia', async ({ page }) => {
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

  await test.step('enviar el formulario vacío muestra el error de campos requeridos', async () => {
    await page.getByRole('button', { name: 'Cargar conferencia' }).click()

    await expect(page.getByRole('alert')).toContainText(/título/i)
    await expect(page).toHaveURL(/\/conferencias\/nueva$/)
  })

  await test.step('completar los datos y adjuntar la extensión equivocada muestra el error de formato', async () => {
    await page.getByLabel('Título').fill('Series de tiempo aplicadas a la demanda de transporte urbano')
    await page.getByLabel('Ponente').fill('Tomás Iriarte Villalba')
    await page.getByLabel('Evento', { exact: true }).fill('Coloquio de Ciencia de Datos del Norte')
    await page.getByLabel('Fecha del evento').fill('2026-05-14')

    await expect(page.getByRole('radio', { name: 'Audio' })).toBeChecked()

    await page
      .getByLabel('Archivo', { exact: true })
      .setInputFiles('tests/e2e/fixtures/transcripcion-demo.txt')

    await page.getByRole('button', { name: 'Cargar conferencia' }).click()

    await expect(page.getByRole('alert')).toContainText(/formato admitido/i)
  })

  await test.step('adjuntar el archivo correcto y enviar muestra el envío y luego la confirmación', async () => {
    await page.getByLabel('Archivo', { exact: true }).setInputFiles('tests/e2e/fixtures/charla-demo.mp3')

    const boton = page.getByRole('button', { name: 'Cargar conferencia' })
    await boton.click()
    await expect(boton).toHaveAttribute('aria-busy', 'true')

    await expect(
      page.getByText(/Series de tiempo aplicadas a la demanda de transporte urbano/),
    ).toBeVisible()
    await expect(page.getByLabel('Título')).toHaveCount(0)
  })

  await test.step('"Cargar otra conferencia" limpia el formulario', async () => {
    await page.getByRole('button', { name: 'Cargar otra conferencia' }).click()

    await expect(page.getByLabel('Título')).toHaveValue('')
  })

  await test.step('volver a Conferencias no muestra la conferencia recién cargada', async () => {
    await page.getByLabel('Título').fill('Otra charla de prueba')
    await page.getByLabel('Ponente').fill('Alguien Cualquiera')
    await page.getByLabel('Evento', { exact: true }).fill('Evento de prueba')
    await page.getByLabel('Fecha del evento').fill('2026-06-01')
    await page.getByLabel('Archivo', { exact: true }).setInputFiles('tests/e2e/fixtures/charla-demo.mp3')
    await page.getByRole('button', { name: 'Cargar conferencia' }).click()

    await page.getByRole('link', { name: 'Ver mis conferencias' }).click()
    await expect(page).toHaveURL(/\/conferencias$/)

    await expect(page.getByText('Otra charla de prueba')).toHaveCount(0)
  })
})
