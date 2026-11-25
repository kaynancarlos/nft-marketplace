import { expect, goto, test } from './support/fixtures'

test.describe('Acessibilidade e teclado', () => {
  test('link "pular para o conteúdo" e foco visível', async ({ page }) => {
    await goto(page, '/')
    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: 'Pular para o conteúdo' })
    await expect(skip).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('#conteudo')).toBeFocused()
  })

  test('diálogo prende o foco, fecha com Esc e devolve o foco ao gatilho', async ({ page }) => {
    await goto(page, '/nft/emerald-ape-042')
    const trigger = page.getByRole('button', { name: 'Ampliar imagem' })
    await trigger.focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // O foco circula dentro do diálogo.
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('Tab')
      expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true)
    }

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()
  })

  test('abas do detalhe navegáveis por setas', async ({ page }) => {
    await goto(page, '/nft/emerald-ape-042')
    const details = page.getByRole('tab', { name: 'Detalhes do NFT' })
    await details.focus()
    await page.keyboard.press('ArrowRight')
    const reviews = page.getByRole('tab', { name: /Avaliações de colecionadores/ })
    await expect(reviews).toBeFocused()
    await expect(reviews).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('tabpanel')).toContainText('marina.eth')
  })

  test('erros de formulário associados aos campos e anunciados', async ({ page }) => {
    await goto(page, '/login')
    const dialog = page.getByRole('dialog', { name: 'Entrar' })
    await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
    const email = dialog.getByLabel('E-mail')
    await expect(email).toHaveAttribute('aria-invalid', 'true')
    const describedBy = await email.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    await expect(page.locator(`#${describedBy}`)).toHaveAttribute('role', 'alert')
    await expect(page.locator(`#${describedBy}`)).toHaveText('Informe o e-mail.')
  })

  test('catálogo operável só com teclado até o detalhe', async ({ page }) => {
    await goto(page, '/')
    const firstCard = page.getByTestId('nft-card').first().getByRole('link')
    await firstCard.focus()
    await expect(firstCard).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/nft\//)
  })

  test('sem overflow horizontal em 390 px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    for (const path of ['/', '/nft/emerald-ape-042', '/cart', '/login']) {
      await goto(page, path)
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow, `overflow em ${path}`).toBeLessThanOrEqual(0)
    }
  })
})
