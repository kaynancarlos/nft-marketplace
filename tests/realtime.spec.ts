import { ANA, addToCart, expect, goto, login, mock, openReview, ordersCount, test } from './support/fixtures'

/**
 * Todos os eventos destes testes saem do servidor simulado (MSW) e chegam à
 * interface pelo socket.io-client. Os testes apenas disparam mudanças no
 * estado do servidor via window.__kurio — nunca tocam no cache da UI.
 */
test.describe('Tempo real (Socket.IO)', () => {
  test('mudança de preço no carrinho atualiza o resumo e avisa o usuário', async ({ page }) => {
    await addToCart(page, 'emerald-ape-042', 1)
    await expect(page.getByTestId('realtime-status')).toHaveAttribute('data-status', 'connected')
    await expect(page.getByTestId('quote-subtotal')).toHaveText('1.19 ETH')

    await mock(page, (k) => k.changePrice('emerald-ape-042', '0.10'))

    await expect(page.getByTestId('cart-notices')).toContainText('mudou de 1.19 para 1.29 ETH')
    await expect(page.getByTestId('quote-subtotal')).toHaveText('1.29 ETH')
  })

  test('checkout bloqueia confirmação com cotação desatualizada', async ({ page }) => {
    await login(page, ANA)
    await addToCart(page, 'emerald-ape-042', 1)
    await page.getByRole('button', { name: 'Conectar e finalizar' }).click()
    const review = await openReview(page)
    await expect(review.getByTestId('quote-total')).toHaveText('1.206 ETH')

    // Preço muda enquanto a revisão está aberta.
    await mock(page, (k) => k.changePrice('emerald-ape-042', '0.10'))
    await expect(review.getByTestId('quote-changed')).toBeVisible()
    await expect(review.getByTestId('confirm-order')).toBeDisabled()
    await expect(review.getByTestId('quote-total')).toHaveText('1.306 ETH')

    await review.getByRole('button', { name: 'Aceitar novos valores' }).click()
    await expect(review.getByTestId('confirm-order')).toBeEnabled()
    await review.getByTestId('confirm-order').click()
    await expect(page.getByTestId('order-confirmed')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('receipt-total')).toHaveText('1.306 ETH')
  })

  test('edição esgotada durante a navegação é refletida no detalhe', async ({ page }) => {
    await goto(page, '/nft/golden-beat-207')
    await expect(page.getByTestId('realtime-status')).toHaveAttribute('data-status', 'connected')
    await mock(page, (k) => k.setAvailability('golden-beat-207', 0))
    await expect(page.getByTestId('edition-availability')).toHaveText(/indisponível/)
  })

  test('eventos duplicados ou antigos não regridem o estado', async ({ page }) => {
    await addToCart(page, 'emerald-ape-042', 1)
    await expect(page.getByTestId('realtime-status')).toHaveAttribute('data-status', 'connected')

    await mock(page, (k) => k.changePrice('emerald-ape-042', '0.10'))
    await expect(page.getByTestId('quote-subtotal')).toHaveText('1.29 ETH')
    await expect(page.getByTestId('cart-notices').locator(':scope > div')).toHaveCount(1)

    // Duplicata: mesmo eventId e versão → ignorada.
    await mock(page, (k) => k.replayLastEvent())
    // Evento antigo (versão menor, preço 0.01) → ignorado.
    await mock(page, (k) => k.emitStaleNftEvent('emerald-ape-042'))
    await page.waitForTimeout(500)

    await expect(page.getByTestId('cart-notices').locator(':scope > div')).toHaveCount(1)
    await expect(page.getByTestId('quote-subtotal')).toHaveText('1.29 ETH')
    await goto(page, '/nft/emerald-ape-042')
    await expect(page.getByTestId('nft-price')).toHaveText('1.29 ETH')
  })

  test('desconexão com pedido pendente: reconecta e recupera sem duplicar', async ({ page }) => {
    await login(page, ANA)
    await addToCart(page, 'golden-beat-207', 1)
    await page.getByRole('button', { name: 'Conectar e finalizar' }).click()
    const review = await openReview(page)
    await review.getByTestId('confirm-order').click()
    await expect(page).toHaveURL(/\/orders\/ord_/)
    await expect(page.getByTestId('order-pending')).toBeVisible()

    // Derruba o socket por 4 s: a confirmação (≈2,5 s) acontece com o cliente fora.
    await mock(page, (k) => k.dropSockets(4000))
    await expect(page.getByTestId('realtime-status')).not.toHaveAttribute('data-status', 'connected')

    // Ao reconectar, o cliente reconcilia via REST e exibe a confirmação.
    await expect(page.getByTestId('order-confirmed')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('realtime-status')).toHaveAttribute('data-status', 'connected')
    expect(await ordersCount(page)).toBe(1)
  })

  test('recarregar a página com pedido pendente retoma o mesmo pedido', async ({ page }) => {
    await login(page, ANA)
    await addToCart(page, 'golden-beat-207', 1)
    await page.getByRole('button', { name: 'Conectar e finalizar' }).click()
    const review = await openReview(page)
    await review.getByTestId('confirm-order').click()
    await expect(page.getByTestId('order-pending')).toBeVisible()
    const url = page.url()

    await page.reload()
    expect(page.url()).toBe(url)
    await expect(page.getByTestId('order-confirmed')).toBeVisible({ timeout: 10_000 })
    expect(await ordersCount(page)).toBe(1)
  })
})
