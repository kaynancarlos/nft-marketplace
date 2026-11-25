import type { Page } from '@playwright/test'
import { ANA, expect, goto, login, mock, test } from './support/fixtures'

const favButton = (page: Page) =>
  page.getByRole('button', { name: /^(Favoritar|Remover) Emerald Ape #042/ }).filter({ visible: true })

test.describe('Favoritos', () => {
  test('visitante é levado ao login ao favoritar', async ({ page }) => {
    await goto(page, '/nft/emerald-ape-042')
    await favButton(page).click()
    await expect(page).toHaveURL(/\/login\?.*redirect=/)
  })

  test('favorito persiste para o usuário autenticado', async ({ page }) => {
    await login(page, ANA)
    await goto(page, '/nft/emerald-ape-042')
    const button = favButton(page)
    await expect(button).toHaveAttribute('aria-pressed', 'false')
    await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByText('Emerald Ape #042 adicionado aos favoritos.')).toBeVisible()

    await page.reload()
    await expect(favButton(page)).toHaveAttribute('aria-pressed', 'true')
    const saved = await mock(page, (k) => k.snapshot().favorites['usr_ana'])
    expect(saved).toContain('emerald-ape-042')
  })

  test.describe('falha na mutation', () => {
    test.use({ scenario: 'favorites-fail' })
    test('atualização otimista é revertida e o usuário é avisado', async ({ page }) => {
      await login(page, ANA)
      await goto(page, '/nft/emerald-ape-042')
      const button = favButton(page)
      await button.click()
      // Otimista: marca na hora...
      await expect(button).toHaveAttribute('aria-pressed', 'true')
      // ...e reverte quando a API falha.
      await expect(button).toHaveAttribute('aria-pressed', 'false')
      await expect(page.getByText(/Não foi possível favoritar Emerald Ape #042/)).toBeVisible()
      const saved = await mock(page, (k) => k.snapshot().favorites['usr_ana'])
      expect(saved).not.toContain('emerald-ape-042')
    })
  })
})
