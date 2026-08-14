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
  idUsuario: 'ad474b7c-4a6e-4092-8c7e-ccf8701d9178',
}

/*
  El panel de carga exige una API key configurada (ver `PanelDeCarga.tsx`):
  esta prueba verifica el recorrido de carga en sí, no ese bloqueo (que tiene
  su propia prueba, "sin API key configurada..."). `PanelDeCarga` está
  siempre montado (solo se desliza con `translate-x`, nunca se desmonta), así
  que `useApiKey` lee `sessionStorage` una sola vez, al montar -- sembrar la
  clave DESPUÉS de esa lectura no la vería. Por eso va en `addInitScript`,
  antes de que cargue cualquier script de la página, en vez de un
  `page.evaluate` posterior al login.
*/
test('recorrido completo de la carga de conferencia desde el dashboard', async ({ page }) => {
  const panel = page.getByRole('dialog', { name: 'Cargar conferencia' })
  const selectorDeEvento = panel.getByLabel('Evento', { exact: true })
  const selectorDePonente = panel.getByLabel('Ponente', { exact: true })

  await test.step('acceder y abrir el panel de carga desde Conferencias', async () => {
    await page.addInitScript(
      ({ clave, idUsuario }) => {
        sessionStorage.setItem('bitacora-ai.configuracion', JSON.stringify({ [idUsuario]: clave }))
      },
      { clave: 'sk-prueba-e2e', idUsuario: CUENTA.idUsuario },
    )
    await page.goto('/acceso')
    await page.getByLabel('Correo').fill(CUENTA.correo)
    await page.getByLabel('Contraseña').fill(CUENTA.contrasena)
    await page.getByRole('button', { name: 'Acceder' }).click()
    await expect(page).toHaveURL(/\/conferencias$/)

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

test('sin API key configurada, el panel de carga la exige y lleva a configurarla', async ({ page }) => {
  await page.goto('/acceso')
  await page.getByLabel('Correo').fill(CUENTA.correo)
  await page.getByLabel('Contraseña').fill(CUENTA.contrasena)
  await page.getByRole('button', { name: 'Acceder' }).click()
  await expect(page).toHaveURL(/\/conferencias$/)

  await page.getByRole('button', { name: 'Cargar conferencia' }).click()

  const panel = page.getByRole('dialog', { name: 'Cargar conferencia' })
  await expect(panel).toBeVisible()
  await expect(panel.getByText(/API key/)).toBeVisible()
  await expect(panel.getByLabel('Título')).toHaveCount(0)

  await panel.getByRole('button', { name: 'Ir a Configuración' }).click()

  await expect(page).toHaveURL(/\/configuracion#config-api-key$/)
  await expect(page.getByRole('textbox', { name: 'API key' })).toBeFocused()
})
