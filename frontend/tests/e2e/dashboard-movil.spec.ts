import { expect, test } from '@playwright/test'

/*
  El dashboard en viewport angosto. Complementa al recorrido de escritorio con
  lo que solo se puede comprobar aquí: que la fila se lea en una columna, que
  los controles sigan alcanzables y que el detalle se abra con el cajón cerrado.

  Rodrigo Peñaloza es la cuenta de esta spec porque las otras tres ya están
  tomadas por las specs de F1 y por el recorrido de escritorio, y
  `fullyParallel` está activo. Credenciales copiadas de
  `src/features/auth/session/cuentas.fixture.ts`.
*/
const CUENTA = {
  correo: 'rodrigo.penaloza@labanfora.org',
  contrasena: 'Coloquio-Norte',
}

test('el dashboard se recorre en pantalla angosta', async ({ page }) => {
  await page.goto('/acceso')
  await page.getByLabel('Correo').fill(CUENTA.correo)
  await page.getByLabel('Contraseña').fill(CUENTA.contrasena)
  await page.getByRole('button', { name: 'Acceder' }).click()
  await expect(page).toHaveURL(/\/conferencias$/)

  const filas = page.getByRole('list', { name: 'Conferencias' }).getByRole('listitem')

  await test.step('el listado muestra lo visible para esa cuenta', async () => {
    await expect(filas).toHaveCount(3)
  })

  await test.step('los controles siguen alcanzables en ancho angosto', async () => {
    await expect(page.getByRole('radio', { name: 'Mías' })).toBeVisible()

    await page.getByRole('radio', { name: 'Mías' }).click()
    await expect(filas).toHaveCount(2)

    await page.getByLabel('Estado de procesamiento').selectOption('procesada')
    await expect(filas).toHaveCount(1)
  })

  /*
    Peñaloza no tiene ninguna etiqueta: es el caso que deja ver el texto que
    invita a crear la primera.
  */
  await test.step('sin etiquetas propias, el filtro invita a crear la primera', async () => {
    await expect(page.getByText(/Todavía no tienes etiquetas/)).toBeVisible()
  })

  await test.step('abrir una fila lleva al detalle con el cajón cerrado', async () => {
    await filas.first().getByRole('link').click()

    await expect(page).toHaveURL(/\/conferencias\/cnf-pen-01/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Secciones de Bitácora AI' })).toBeHidden()
    await expect(page.getByRole('button', { name: 'Abrir la navegación' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })
})
