import { expect, test } from '@playwright/test'

test('crear campaña y resolver Loot → Weapon Category → Slug Weapons en la post-batalla', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Nueva campaña' }).click()
  await page.getByLabel('Nombre').fill('Nova Rest')
  await page.getByRole('button', { name: 'Crear' }).click()
  await expect(page.getByRole('heading', { name: 'Nova Rest' })).toBeVisible()

  await page.getByRole('link', { name: 'Turno 1' }).click()
  await page.getByRole('tab', { name: /Post-batalla/ }).click()
  await page.getByRole('button', { name: 'Loot Table' }).first().click()

  const panel = page.getByLabel('Panel de tabla')
  // Teclado propio: 1 0 → Weapon
  await panel.getByRole('button', { name: '1', exact: true }).click()
  await panel.getByRole('button', { name: '0', exact: true }).click()
  await expect(panel.getByRole('heading', { name: 'Weapon', exact: true })).toBeVisible()
  await panel.getByRole('button', { name: 'Confirmar' }).click()
  await panel.getByRole('button', { name: /Siguiente: Roll Weapon Category/ }).click()
  await panel.getByLabel('Resultado D100').fill('20')
  await panel.getByRole('button', { name: 'Confirmar' }).click()
  await panel.getByRole('button', { name: /Siguiente: Roll Slug Weapons/ }).click()
  await panel.getByLabel('Resultado D100').fill('7')
  await expect(panel.getByRole('heading', { name: 'Hand Gun' })).toBeVisible()
  await panel.getByRole('button', { name: 'Confirmar' }).click()

  await expect(page.getByRole('status').filter({ hasText: 'Anotado' })).toBeVisible()
  await page.screenshot({ path: 'test-results/turn-tablet.png' })

  await page.getByRole('link', { name: 'Diario' }).click()
  await expect(page.getByText(/Slug Weapons Subtable \(D100=7\): Hand Gun/)).toBeVisible()
})
