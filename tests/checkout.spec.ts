import { ANA, addToCart, expect, isMobile, login, mock, openReview, ordersCount, test } from './support/fixtures'

test.describe('Compra completa', () => {
  test('do catálogo ao recibo confirmado, com snapshot imutável', async ({ page }) => {
    await login(page, ANA)
    // Do catálogo: abre o card e compra.
    await page.getByTestId('nft-card').filter({ hasText: 'Emerald Ape #042' }).first().getByRole('link').click()
    await expect(page).toHaveURL(/\/nft\/emerald-ape-042/)
    await page.getByRole('button', { name: /^Aumentar quantidade/ }).filter({ visible: true }).click()
    await page.getByRole('button', { name: /^Comprar( NFT)?$/ }).click()
    await expect(page).toHaveURL(/\/cart$/)
    const total = await page.getByTestId('quote-total').innerText()
    expect(total).toBe('2.396 ETH')

    await page.getByRole('button', { name: 'Conectar e finalizar' }).click()
    await expect(page).toHaveURL(/\/checkout$/)
    await expect(page.locator('#displayName')).toHaveValue(ANA.name)

    const review = await openReview(page)
    await expect(review.getByTestId('quote-total')).toHaveText(total)
    await review.getByTestId('confirm-order').click()

    await expect(page).toHaveURL(/\/orders\/ord_/)
    await expect(page.getByTestId('order-pending').or(page.getByTestId('order-confirmed'))).toBeVisible()
    await expect(page.getByTestId('order-confirmed')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('receipt-total')).toHaveText(total)
    await expect(page.getByTestId('receipt-items')).toContainText('Emerald Ape #042')
    await expect(page.getByTestId('receipt-items')).toContainText('(x 2)')

    // Itens comprados saíram do carrinho.
    if (!isMobile(page)) await expect(page.getByTestId('cart-count')).toHaveText('0')
    expect(await ordersCount(page)).toBe(1)

    // Alterações posteriores no catálogo não mudam o recibo.
    await mock(page, (k) => k.changePrice('emerald-ape-042', '5'))
    await page.reload()
    await expect(page.getByTestId('receipt-total')).toHaveText(total)

    // Explorador simulado.
    await page.getByRole('link', { name: 'Ver no Etherscan' }).click()
    await expect(page.getByRole('heading', { name: 'Detalhes da transação' })).toBeVisible()
  })

  test('validação do formulário de pagamento', async ({ page }) => {
    await login(page, ANA)
    await addToCart(page, 'golden-beat-207')
    await page.getByRole('button', { name: 'Conectar e finalizar' }).click()
    // Ids explícitos: o rodapé também tem um campo de e-mail (newsletter).
    await page.locator('#email').fill('email-invalido')
    await page.locator('#displayName').fill('')
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(page.locator('#email')).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByText('Informe um e-mail válido.')).toBeVisible()
    await expect(page.locator('#displayName')).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByRole('dialog', { name: 'Revise seu pedido' })).toBeHidden()
  })

  test.describe('carteira recusa a conexão', () => {
    test.use({ scenario: 'wallet-rejected' })
    test('mostra a recusa e não permite confirmar', async ({ page }) => {
      await login(page, ANA)
      await addToCart(page, 'golden-beat-207')
      await page.getByRole('button', { name: 'Conectar e finalizar' }).click()
      await page.getByRole('button', { name: 'Conectar carteira' }).click()
      await expect(page.getByTestId('wallet-error')).toContainText('recusada')
      await page.getByRole('button', { name: 'Confirmar compra' }).click()
      await expect(page.getByTestId('checkout-error')).toContainText('Conecte a carteira')
    })
  })
})
