import { ANA, BRUNO, expect, goto, isMobile, login, test } from './support/fixtures'

test.describe('Conta e sessão', () => {
  test('cadastro com validação e conflito, depois criação com sucesso', async ({ page }) => {
    await goto(page, '/register')
    const dialog = page.getByRole('dialog', { name: 'Criar perfil de colecionador' })

    // Validação local.
    await dialog.getByRole('button', { name: 'Criar perfil' }).click()
    await expect(dialog.getByLabel('Nome de usuário')).toHaveAttribute('aria-invalid', 'true')

    // Conflito retornado pela API (e-mail já cadastrado).
    await dialog.getByLabel('Nome de usuário').fill('nova.colecionadora')
    await dialog.getByLabel('E-mail').fill(ANA.email)
    await dialog.getByLabel('Senha', { exact: true }).fill('Segura123')
    await dialog.getByLabel('Confirmar senha', { exact: true }).fill('Segura123')
    await dialog.getByRole('button', { name: 'Criar perfil' }).click()
    await expect(dialog.getByText('Este e-mail já está cadastrado.')).toBeVisible()
    await expect(dialog.getByLabel('E-mail')).toHaveAttribute('aria-invalid', 'true')

    // Sucesso.
    await dialog.getByLabel('E-mail').fill('nova@kurio.dev')
    await dialog.getByRole('button', { name: 'Criar perfil' }).click()
    await expect(page.getByRole('dialog')).toBeHidden()
    await expect.poll(() => page.evaluate(() => localStorage.getItem('kurio:session'))).toContain('nova.colecionadora')
  })

  test('login inválido mostra erro e login válido retorna ao fluxo anterior', async ({ page }) => {
    await goto(page, '/login?redirect=%2Faccount%2Fwallets')
    const dialog = page.getByRole('dialog', { name: 'Entrar' })
    await dialog.getByLabel('E-mail').fill(ANA.email)
    await dialog.getByLabel('Senha', { exact: true }).fill('senha-errada1')
    await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page.getByTestId('login-error')).toHaveText('E-mail ou senha incorretos.')

    await dialog.getByLabel('Senha', { exact: true }).fill(ANA.password)
    await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page).toHaveURL(/\/account\/wallets$/)
  })

  test('rota privada redireciona para o login preservando o destino', async ({ page }) => {
    await goto(page, '/account/profile')
    await expect(page).toHaveURL(/\/login\?.*redirect=/)
    await login(page, ANA)
    await goto(page, '/account/profile')
    await expect(page.getByRole('heading', { name: 'Perfil do colecionador' })).toBeVisible()
  })

  test('sessão expirada durante a navegação leva ao login com aviso (relógio controlado)', async ({ page }) => {
    await login(page, ANA)
    await goto(page, '/account/profile')
    await expect(page.getByLabel('Nome de exibição')).toHaveValue(ANA.name)

    // Avança o relógio da página 3 h: a sessão (TTL 2 h) expira para o servidor e para o cliente.
    await page.clock.setFixedTime(Date.now() + 3 * 60 * 60 * 1000)
    await page.reload()
    await expect(page).toHaveURL(/\/login\?.*redirect=/)
    await expect(page.getByTestId('session-expired-notice')).toBeVisible()
  })

  test('logout e troca de usuário não vazam dados da sessão anterior', async ({ page }) => {
    test.skip(isMobile(page), 'menu do usuário é validado no desktop')
    await login(page, ANA)
    await goto(page, '/account/favorites')
    await expect(page.getByTestId('favorites-grid').getByText('Sage Nomad #009')).toBeVisible()

    await page.getByTestId('logout-button').click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('link', { name: 'Entrar' })).toBeVisible()
    expect(await page.evaluate(() => localStorage.getItem('kurio:session'))).toBeNull()

    await login(page, BRUNO)
    await goto(page, '/account/favorites')
    await expect(page.getByTestId('favorites-grid').getByText('Golden Beat #207')).toBeVisible()
    await expect(page.getByText('Sage Nomad #009')).toHaveCount(0)
    await expect(page.getByTestId('current-user')).toHaveText(BRUNO.name)
  })

  test('pedido de outro usuário retorna acesso não autorizado', async ({ page }) => {
    await login(page, ANA)
    await goto(page, '/orders/ord_bruno_0001')
    await expect(page.getByTestId('order-forbidden')).toBeVisible()
  })
})
