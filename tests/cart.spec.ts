import { ANA, addToCart, cartItems, expect, goto, isMobile, login, test } from './support/fixtures'

test.describe('Carrinho', () => {
  test('quantidades, remoção, cupom e totais da API', async ({ page }) => {
    await addToCart(page, 'emerald-ape-042', 2)
    await addToCart(page, 'golden-beat-207', 1)
    await expect(cartItems(page)).toHaveCount(2)

    // Valores vindos da cotação: 2 × 1.19 + 0.99 = 3.37 (+ taxa 0.016).
    await expect(page.getByTestId('quote-subtotal')).toHaveText('3.37 ETH')
    await expect(page.getByTestId('quote-total')).toHaveText('3.386 ETH')

    // Alterar quantidade.
    await page.getByRole('button', { name: 'Diminuir quantidade de Emerald Ape #042' }).filter({ visible: true }).click()
    await expect(page.getByTestId('quote-subtotal')).toHaveText('2.18 ETH')

    // Cupom inválido / expirado / válido.
    const coupon = page.getByRole('textbox', { name: 'Código promocional' })
    await coupon.fill('NAOEXISTE')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page.locator('#coupon-error')).toHaveText('Cupom inválido. Confira o código digitado.')
    await coupon.fill('VERAO2024')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page.locator('#coupon-error')).toHaveText('Este cupom expirou.')
    await coupon.fill('KURIO10')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page.getByTestId('coupon-applied')).toContainText('KURIO10')
    await expect(page.getByTestId('quote-discount')).toHaveText('(-) 0.218 ETH')
    await expect(page.getByTestId('quote-total')).toHaveText('1.978 ETH')

    // Remover cupom e item.
    await page.getByTestId('coupon-applied').getByRole('button', { name: 'Remover' }).click()
    await expect(page.getByTestId('quote-discount')).toHaveText('(-) 0.00 ETH')
    await page.getByRole('button', { name: 'Remover Golden Beat #207 do carrinho' }).filter({ visible: true }).click()
    await expect(cartItems(page)).toHaveCount(1)
    await expect(page.getByTestId('quote-subtotal')).toHaveText('1.19 ETH')
  })

  test('persiste após refresh e preserva itens do visitante ao autenticar', async ({ page }) => {
    await addToCart(page, 'ivory-baron-088', 2)
    await page.reload()
    await expect(cartItems(page)).toHaveCount(1)

    await login(page, ANA, '/cart')
    await expect(page).toHaveURL(/\/cart$/)
    await expect(cartItems(page)).toHaveCount(1)
    await expect(cartItems(page).first()).toContainText('Ivory Baron #088')
    if (!isMobile(page)) await expect(page.getByTestId('cart-count')).toHaveText('2')
  })

  test('carrinho vazio', async ({ page }) => {
    await goto(page, '/cart')
    await expect(page.getByRole('heading', { name: 'Seu carrinho está vazio' })).toBeVisible()
  })
})
