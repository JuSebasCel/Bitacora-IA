import { expect, test } from '@playwright/test'

/*
  El shell en viewport angosto: la barra lateral deja de ser una columna fija y
  pasa a ser un cajón, que se abre desde la barra superior.
*/
const CUENTA = {
  correo: 'joaquin.berrio@labanfora.org',
  contrasena: 'Ponencias-Mayo',
}

/*
  En pantalla angosta el panel de identidad desaparece y su encabezado compacto
  ocupa su lugar. Tampoco aquí puede quedar el nombre del producto duplicado.
*/
test('en pantalla angosta el acceso muestra un solo nombre de producto', async ({ page }) => {
  await page.goto('/acceso')

  const titulos = page.getByRole('heading', { level: 1, name: 'Bitácora AI' })
  await expect(titulos).toHaveCount(1)
  await expect(titulos).toBeVisible()
})

test('en pantalla angosta la navegación se abre y se cierra desde la barra superior', async ({
  page,
}) => {
  await page.goto('/acceso')
  await page.getByLabel('Correo').fill(CUENTA.correo)
  await page.getByLabel('Contraseña').fill(CUENTA.contrasena)
  await page.getByRole('button', { name: 'Acceder' }).click()
  await expect(page).toHaveURL(/\/conferencias$/)

  const navegacion = page.getByRole('navigation', { name: 'Secciones de Bitácora AI' })
  const abrir = page.getByRole('button', { name: 'Abrir la navegación' })

  await expect(abrir).toHaveAttribute('aria-expanded', 'false')
  await expect(navegacion).toBeHidden()

  await abrir.click()

  const cerrar = page.getByRole('button', { name: 'Cerrar la navegación' })
  await expect(cerrar).toHaveAttribute('aria-expanded', 'true')
  await expect(navegacion).toBeVisible()

  await test.step('elegir una sección cierra el cajón', async () => {
    await navegacion.getByRole('link', { name: 'Memorias' }).click()
    await expect(page).toHaveURL(/\/memorias$/)
    await expect(page.getByRole('button', { name: 'Abrir la navegación' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })
})
