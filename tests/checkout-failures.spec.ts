import { ANA, addToCart, cartItems, expect, login, openReview, ordersCount, test } from './support/fixtures'

async function goToCheckout(page: import('@playwright/test').Page) {
  await login(page, ANA)
  await addToCart(page, 'ivory-baron-088', 1)
  await page.getByRole('button', { name: 'Conectar e finalizar' }).click()
  await expect(page).toHaveURL(/\/checkout$/)
}

test.describe('Falhas de pagamento', () => {
  test.describe('pagamento recusado', () => {
    test.use({ scenario: 'payment-rejected' })
    test('pedido recusado é terminal e preserva os itens', async ({ page }) => {
      await goToCheckout(page)
      const review = await openReview(page)
      await review.getByTestId('confirm-order').click()
      await expect(page.getByTestId('order-rejected')).toBeVisible({ timeout: 10_000 })
      await expect(page.getByTestId('order-confirmed')).toHaveCount(0)
      await page.getByRole('link', { name: 'Ver carrinho' }).click()
      await expect(cartItems(page)).toHaveCount(1)
    })
  })

  test('clique repetido cria um único pedido', async ({ page }) => {
    await goToCheckout(page)
    const review = await openReview(page)
    const confirm = review.getByTestId('confirm-order')
    await confirm.dblclick()
    await expect(page).toHaveURL(/\/orders\/ord_/)
    expect(await ordersCount(page)).toBe(1)
  })

  test.describe('timeout após criar o pedido', () => {
    test.use({ scenario: 'order-timeout' })
    test('o reenvio com a mesma chave recupera o mesmo pedido', async ({ page }) => {
      test.setTimeout(60_000)
      await goToCheckout(page)
      const review = await openReview(page)
      await review.getByTestId('confirm-order').click()
      await expect(review.getByTestId('confirm-order')).toHaveText(/Enviando pedido/)

      // 1ª resposta demora 15 s → cliente desiste em 8 s → retry com a mesma chave.
      await expect(page).toHaveURL(/\/orders\/ord_/, { timeout: 20_000 })
      await expect(page.getByTestId('order-confirmed')).toBeVisible({ timeout: 10_000 })
      expect(await ordersCount(page)).toBe(1)

      // Refresh não cria outra compra.
      await page.reload()
      await expect(page.getByTestId('order-confirmed')).toBeVisible()
      expect(await ordersCount(page)).toBe(1)
    })
  })

  test.describe('preço muda na compra', () => {
    test.use({ scenario: 'price-change-at-checkout' })
    test('a API rejeita a cotação antiga e exige nova confirmação', async ({ page }) => {
      await goToCheckout(page)
      const review = await openReview(page)
      const before = await review.getByTestId('quote-total').innerText()
      await review.getByTestId('confirm-order').click()
      await expect(review.getByTestId('quote-changed')).toBeVisible()
      await expect(review.getByTestId('confirm-order')).toBeDisabled()
      await expect(review.getByTestId('quote-total')).not.toHaveText(before)
      await review.getByRole('button', { name: 'Aceitar novos valores' }).click()
      await review.getByTestId('confirm-order').click()
      await expect(page.getByTestId('order-confirmed')).toBeVisible({ timeout: 10_000 })
      expect(await ordersCount(page)).toBe(1)
    })
  })

  test.describe('edição esgota na compra', () => {
    test.use({ scenario: 'sold-out-at-checkout' })
    test('a compra é bloqueada e o carrinho é preservado', async ({ page }) => {
      await goToCheckout(page)
      const review = await openReview(page)
      await review.getByTestId('confirm-order').click()
      await expect(review.getByText(/esgotou/)).toBeVisible()
      await expect(review.getByTestId('confirm-order')).toBeDisabled()
      expect(await ordersCount(page)).toBe(0)
    })
  })
})
