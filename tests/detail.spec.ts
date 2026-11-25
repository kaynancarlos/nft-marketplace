import { expect, goto, test } from './support/fixtures'

test.describe('Detalhe do NFT', () => {
  test('acesso direto mostra informações, edições e limite de quantidade', async ({ page }) => {
    await goto(page, '/nft/emerald-ape-042')
    await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
    await expect(page).toHaveTitle(/Emerald Ape #042/)

    // Edição 1/1 esgotada fica indisponível.
    await expect(page.getByRole('radio', { name: '1/1 (esgotada)' })).toBeDisabled()

    // Edição 1/10: limite = disponibilidade (≤ 10).
    await page.getByText('1/10', { exact: true }).click()
    const availability = await page.getByTestId('edition-availability').innerText()
    const limit = Number(/limite de (\d+)/.exec(availability)?.[1])
    expect(limit).toBeGreaterThan(0)
    const plus = page.getByRole('button', { name: /^Aumentar quantidade/ })
    for (let i = 1; i < limit; i++) await plus.click()
    await expect(plus).toBeDisabled()
  })

  test('NFT inexistente mostra recurso não encontrado', async ({ page }) => {
    await goto(page, '/nft/nao-existe-999')
    await expect(page.getByTestId('nft-not-found')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'NFT não encontrado' })).toBeVisible()
  })

  test('NFT totalmente esgotado não permite compra', async ({ page }) => {
    await goto(page, '/nft/lunar-echo-777')
    await expect(page.getByRole('button', { name: 'Esgotado' })).toBeDisabled()
    await expect(page.getByTestId('edition-availability')).toHaveText(/indisponível/)
  })

  test('rota inexistente mostra 404', async ({ page }) => {
    await goto(page, '/rota/que/nao/existe')
    await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible()
  })
})
