import { expect, test } from '@playwright/test'

test('la app arranca y navega a la lista de tablas', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Campañas' })).toBeVisible()
  await page.getByRole('link', { name: 'Tablas' }).click()
  await expect(page).toHaveURL(/#\/tables$/)
  await expect(page.getByText('Injury Table', { exact: true })).toBeVisible()
})
