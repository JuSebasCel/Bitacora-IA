import { expect, test } from '@playwright/test'

/*
  Criterio de aceptación de F3 (panel de carga integrado al dashboard): un
  recorrido continuo desde el botón "Cargar conferencia" en /conferencias,
  pasando por crear un evento y un ponente al vuelo, hasta ver la conferencia
  nueva en el listado con su estado "Procesando" y su barra de avance.

  F3 ya no es una pantalla aparte (PRD.md sección 6, PLAN.md sección 7): el
  formulario vive en un panel lateral disparado desde el dashboard, y lo
  cargado sí se persiste (por sesión, por usuario) y aparece de inmediato en
  el listado. Se reutiliza la cuenta de Camila Zuluaga: el listado que ve
  (7 conferencias) es exclusivo de esta spec bajo `fullyParallel`, y la
  conferencia que esta prueba agrega no la ve ninguna otra cuenta.

  Cuenta real de Supabase Auth (B1), con el mismo UUID que ya usan los
  fixtures de conferencias/fichas de `conferencias.fixture.ts`.
  `tsconfig.e2e.json` no tiene el alias `@/`, así que desde aquí no se puede
  importar nada de `src`.
*/
const CUENTA = {
  correo: 'camila.zuluaga@labanfora.org',
  contrasena: 'Simposio-Andes',
}

test.describe('carga de conferencia y su requisito de API key (B2)', () => {
  /*
    Las dos pruebas de este bloque comparten la cuenta de Camila y las dos
    tocan su API key real (una la exige ausente, la otra la guarda). Bajo
    `fullyParallel` (playwright.config.ts) correrían en workers distintos al
    mismo tiempo y se pisarían sobre la misma cuenta real -- se fuerza modo
    serie solo aquí, y la prueba que necesita "sin clave" va primero y se
    limpia a sí misma por si una corrida anterior dejó una guardada.
  */
  test.describe.configure({ mode: 'serial' })

  test('sin API key configurada, el panel de carga la exige y lleva a configurarla', async ({ page }) => {
    await page.goto('/acceso')
    await page.getByLabel('Correo').fill(CUENTA.correo)
    await page.getByLabel('Contraseña').fill(CUENTA.contrasena)
    await page.getByRole('button', { name: 'Acceder' }).click()
    await expect(page).toHaveURL(/\/conferencias$/)

    await page.goto('/configuracion')
    await expect(page.getByText('Cargando…')).toBeHidden()

    const botonQuitar = page.getByRole('button', { name: 'Quitar mi API key' })
    if ((await botonQuitar.count()) > 0) {
      await botonQuitar.click()
      await expect(page.getByText('API key eliminada.', { exact: true })).toBeVisible()
    }

    await page.goto('/conferencias')
    await page.getByRole('button', { name: 'Cargar conferencia' }).click()

    const panel = page.getByRole('dialog', { name: 'Cargar conferencia' })
    await expect(panel).toBeVisible()
    await expect(panel.getByText(/API key/)).toBeVisible()
    await expect(panel.getByLabel('Título')).toHaveCount(0)

    await panel.getByRole('button', { name: 'Ir a Configuración' }).click()

    await expect(page).toHaveURL(/\/configuracion#config-api-key$/)
    await expect(page.getByRole('textbox', { name: 'API key' })).toBeFocused()
  })

  test('recorrido completo de la carga de conferencia desde el dashboard', async ({ page }) => {
    const panel = page.getByRole('dialog', { name: 'Cargar conferencia' })
    const selectorDeEvento = panel.getByLabel('Evento', { exact: true })
    const selectorDePonente = panel.getByLabel('Ponente', { exact: true })

    await test.step('acceder, guardar la API key y abrir el panel de carga desde Conferencias', async () => {
      await page.goto('/acceso')
      await page.getByLabel('Correo').fill(CUENTA.correo)
      await page.getByLabel('Contraseña').fill(CUENTA.contrasena)
      await page.getByRole('button', { name: 'Acceder' }).click()
      await expect(page).toHaveURL(/\/conferencias$/)

      await page.goto('/configuracion')
      await page.getByRole('textbox', { name: 'API key' }).fill('sk-prueba-e2e')
      await page.getByRole('button', { name: 'Guardar' }).click()
      await expect(page.getByText('API key guardada.', { exact: true })).toBeVisible()

      await page.goto('/conferencias')
      await page.getByRole('button', { name: 'Cargar conferencia' }).click()
      await expect(panel).toBeVisible()
    })

    await test.step('enviar el formulario vacío muestra un error por cada campo sin completar', async () => {
      await panel.getByRole('button', { name: 'Cargar conferencia' }).click()

      await expect(panel.getByRole('alert').first()).toBeVisible()
      await expect(selectorDeEvento).toHaveAttribute('aria-invalid', 'true')
      await expect(panel).toBeVisible()
    })

    await test.step('el selector de ponente empieza deshabilitado', async () => {
      await expect(selectorDePonente).toBeDisabled()
    })

    await test.step('crear un evento nuevo al vuelo lo deja elegido y habilita el de ponente', async () => {
      await selectorDeEvento.selectOption({ label: '+ Crear evento nuevo…' })

      const dialogo = page.getByRole('dialog').filter({ hasText: 'Nuevo evento' })
      await expect(dialogo).toBeVisible()

      await dialogo.getByLabel('Nombre').fill('Encuentro de Prueba E2E')
      await dialogo.getByRole('button', { name: 'Crear' }).click()

      await expect(dialogo).toBeHidden()
      await expect(selectorDeEvento).toHaveValue(/encuentro-de-prueba-e2e/)
      await expect(selectorDePonente).toBeEnabled()
    })

    await test.step('crear un ponente nuevo al vuelo lo deja elegido', async () => {
      await selectorDePonente.selectOption({ label: '+ Crear ponente nuevo…' })

      const dialogo = page.getByRole('dialog').filter({ hasText: 'Nuevo ponente' })
      await expect(dialogo).toBeVisible()

      await dialogo.getByLabel('Nombre').fill('Ponente de Prueba')
      await dialogo.getByRole('button', { name: 'Crear' }).click()

      await expect(dialogo).toBeHidden()
      await expect(selectorDePonente.locator('option:checked')).toHaveText('Ponente de Prueba')
    })

    await test.step('la vista previa refleja el evento y el ponente elegidos', async () => {
      const vistaPrevia = panel.getByRole('complementary', { name: 'Vista previa' })

      await expect(vistaPrevia.getByText('Encuentro de Prueba E2E')).toBeVisible()
      await expect(vistaPrevia.getByText('Ponente de Prueba')).toBeVisible()
    })

    await test.step('completar los datos y adjuntar la extensión equivocada muestra el error de formato', async () => {
      await panel.getByLabel('Título').fill('Charla de prueba end to end')
      await panel.getByLabel('Fecha del evento').fill('2026-05-14')

      await expect(panel.getByRole('radio', { name: 'Audio' })).toBeChecked()

      await panel
        .getByLabel('Archivo', { exact: true })
        .setInputFiles('tests/e2e/fixtures/transcripcion-demo.txt')

      await panel.getByRole('button', { name: 'Cargar conferencia' }).click()

      await expect(panel.getByRole('alert')).toContainText(/formato admitido/i)
    })

    await test.step('adjuntar el archivo correcto y enviar cierra el panel y agrega la fila procesando', async () => {
      await panel.getByLabel('Archivo', { exact: true }).setInputFiles('tests/e2e/fixtures/charla-demo.mp3')

      const boton = panel.getByRole('button', { name: 'Cargar conferencia' })
      await boton.click()
      await expect(boton).toHaveAttribute('aria-busy', 'true')

      await expect(panel).toBeHidden()

      const filaNueva = page.getByRole('listitem').filter({ hasText: 'Charla de prueba end to end' })
      await expect(filaNueva).toBeVisible()
      await expect(filaNueva.getByText('Procesando')).toBeVisible()
      await expect(filaNueva.getByRole('progressbar')).toBeVisible()
      await expect(filaNueva).toContainText('Encuentro de Prueba E2E')
      await expect(filaNueva).toContainText('Ponente de Prueba')
    })

    await test.step('recargar la página conserva la conferencia cargada', async () => {
      await page.reload()

      const filaNueva = page.getByRole('listitem').filter({ hasText: 'Charla de prueba end to end' })
      await expect(filaNueva).toBeVisible()
    })
  })
})
