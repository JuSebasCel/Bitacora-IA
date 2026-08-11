import { expect, test, type Page } from '@playwright/test'

/*
  Criterio de aceptación del módulo F1, recorrido de punta a punta tal como lo
  viviría la persona usándolo. Las pruebas unitarias verifican cada pieza por
  separado; esta verifica que el módulo completo funciona.

  Credenciales tomadas del fixture de la sesión simulada
  (src/features/auth/session/cuentas.fixture.ts).
*/
const CUENTA = {
  nombre: 'Valentina Alcántara Rueda',
  correo: 'valentina.alcantara@labanfora.org',
  contrasena: 'Anfora-2026',
}

test('acceso, navegación protegida y cierre de sesión', async ({ page }) => {
  await test.step('una ruta protegida sin sesión lleva al acceso', async () => {
    await page.goto('/conferencias')
    await expect(page).toHaveURL(/\/acceso$/)
  })

  const botonAcceder = page.getByRole('button', { name: 'Acceder' })
  const alerta = page.getByRole('alert')

  await test.step('el formulario vacío muestra un error sin filtrar el código', async () => {
    await botonAcceder.click()
    await expect(alerta).toBeVisible()
    await expect(alerta).not.toContainText('AUTH_')
  })

  await test.step('las credenciales incorrectas muestran el mensaje traducido', async () => {
    await page.getByLabel('Correo').fill(CUENTA.correo)
    await page.getByLabel('Contraseña').fill('esta-clave-no-es')
    await botonAcceder.click()
    await expect(alerta).toBeVisible()
    await expect(alerta).not.toContainText('AUTH_')
  })

  await test.step('las credenciales válidas entran al shell', async () => {
    await page.getByLabel('Contraseña').fill(CUENTA.contrasena)
    await botonAcceder.click()
    await expect(page).toHaveURL(/\/conferencias$/)
    await expect(page.getByText(CUENTA.nombre)).toBeVisible()
  })

  const navegacion = page.getByRole('navigation', { name: 'Secciones de Bitácora AI' })

  await test.step('la barra lateral lista las seis secciones y marca la activa', async () => {
    await expect(navegacion.getByRole('link')).toHaveCount(6)

    /*
      "Conferencias" es prefijo de "Cargar conferencia": solo la primera puede
      quedar marcada al estar en /conferencias.
    */
    await expect(
      navegacion.getByRole('link', { name: 'Conferencias', exact: true }),
    ).toHaveAttribute('aria-current', 'page')
    await expect(navegacion.getByRole('link', { name: 'Cargar conferencia' })).not.toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  await test.step('navegar al catálogo mueve la marca de sección activa', async () => {
    await navegacion.getByRole('link', { name: 'Catálogo' }).click()
    await expect(page).toHaveURL(/\/catalogo$/)
    await expect(navegacion.getByRole('link', { name: 'Catálogo' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    await expect(
      navegacion.getByRole('link', { name: 'Conferencias', exact: true }),
    ).not.toHaveAttribute('aria-current', 'page')
  })

  await test.step('recargar mantiene la sesión abierta', async () => {
    await page.reload()
    await expect(page).toHaveURL(/\/catalogo$/)
    await expect(page.getByText(CUENTA.nombre)).toBeVisible()
  })

  await test.step('cerrar sesión vuelve al acceso y vuelve a proteger las rutas', async () => {
    await page.getByRole('button', { name: 'Cerrar sesión' }).click()
    await expect(page).toHaveURL(/\/acceso$/)

    await page.goto('/conferencias')
    await expect(page).toHaveURL(/\/acceso$/)
  })
})

/*
  El nombre del producto se escribe dos veces en el marcado, una por panel, y
  solo una sobrevive en cada ancho. Si ambas quedaran visibles, la página
  expondría dos h1 y el nombre saldría duplicado.
*/
test('el nombre del producto aparece una sola vez en el acceso', async ({ page }) => {
  await page.goto('/acceso')

  const titulos = page.getByRole('heading', { level: 1, name: 'Bitácora AI' })
  await expect(titulos).toHaveCount(1)
  await expect(titulos).toBeVisible()
})

test('desde el acceso se puede llegar al registro y volver', async ({ page }) => {
  await page.goto('/acceso')

  await page.getByRole('link', { name: 'Crear cuenta' }).click()
  await expect(page).toHaveURL(/\/registro$/)

  await page.getByRole('link', { name: 'Acceder' }).click()
  await expect(page).toHaveURL(/\/acceso$/)
})

async function acceder(page: Page): Promise<void> {
  await page.getByLabel('Correo').fill(CUENTA.correo)
  await page.getByLabel('Contraseña').fill(CUENTA.contrasena)
  await page.getByRole('button', { name: 'Acceder' }).click()
}

test('tras acceder se vuelve a la ruta que se había pedido', async ({ page }) => {
  await page.goto('/plantillas')
  await expect(page).toHaveURL(/\/acceso$/)

  await acceder(page)

  await expect(page).toHaveURL(/\/plantillas$/)
})

test('con la sesión abierta, el acceso aparta al listado de conferencias', async ({ page }) => {
  await page.goto('/acceso')
  await acceder(page)
  await expect(page).toHaveURL(/\/conferencias$/)

  /* Llegar al formulario desde el historial no debe permitir cambiar de sesión. */
  await page.goto('/acceso')
  await expect(page).toHaveURL(/\/conferencias$/)

  await page.goto('/registro')
  await expect(page).toHaveURL(/\/conferencias$/)
})

test('un correo mal formado se nombra como tal, no como credenciales inválidas', async ({
  page,
}) => {
  await page.goto('/acceso')

  await page.getByLabel('Correo').fill('valentina.alcantara@')
  await page.getByLabel('Contraseña').fill(CUENTA.contrasena)
  await page.getByRole('button', { name: 'Acceder' }).click()

  const alerta = page.getByRole('alert')
  await expect(alerta).toContainText('formato')
  await expect(alerta).not.toContainText('AUTH_')
})
