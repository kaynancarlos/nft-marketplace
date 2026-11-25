import { ANA, expect, goto, login, test } from './support/fixtures'

// PNG 1×1 válido.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

test.describe('Perfil e carteiras', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ANA)
  })

  test('edição de perfil com validação local, conflito da API e persistência', async ({ page }) => {
    await goto(page, '/account/profile')
    const name = page.getByLabel('Nome de exibição')
    await expect(name).toHaveValue(ANA.name)

    await name.fill('A')
    await name.blur()
    await expect(page.getByText('Use pelo menos 2 caracteres.')).toBeVisible()

    await name.fill('Ana Atualizada')
    await page.getByLabel('Nome de usuário').fill('bruno.mint')
    await page.getByRole('button', { name: 'Salvar perfil' }).click()
    await expect(page.getByText('Escolha outro nome de usuário.')).toBeVisible()
    await expect(page.getByLabel('Nome de usuário')).toHaveAttribute('aria-invalid', 'true')

    await page.getByLabel('Nome de usuário').fill('ana.atualizada')
    await page.getByRole('button', { name: 'Salvar perfil' }).click()
    await expect(page.getByText('Perfil atualizado.')).toBeVisible()

    await page.reload()
    await expect(page.getByLabel('Nome de exibição')).toHaveValue('Ana Atualizada')
    await expect(page.getByLabel('Nome de usuário')).toHaveValue('ana.atualizada')
  })

  test('avatar: tipo inválido é recusado e imagem válida persiste', async ({ page }) => {
    await goto(page, '/account/profile')
    const input = page.locator('#avatar-input')
    await input.setInputFiles({ name: 'nota.txt', mimeType: 'text/plain', buffer: Buffer.from('oi') })
    await expect(page.locator('#avatar-error')).toHaveText('Use uma imagem PNG, JPG, WEBP ou GIF.')

    await input.setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: PNG })
    await expect(page.getByTestId('avatar-image')).toBeVisible()
    await page.reload()
    await expect(page.getByTestId('avatar-image')).toBeVisible()
  })

  test('alteração de senha com erro de senha atual e sucesso', async ({ page }) => {
    await goto(page, '/account/profile')
    // Ids explícitos: cada campo de senha tem também um botão "Mostrar …" com rótulo parecido.
    await page.locator('#current-password').fill('errada123')
    await page.locator('#new-password').fill('NovaSenha123')
    await page.locator('#confirm-password').fill('NovaSenha123')
    await page.getByRole('button', { name: 'Salvar nova senha' }).click()
    await expect(page.getByText('Senha atual incorreta.')).toBeVisible()

    await page.locator('#current-password').fill(ANA.password)
    await page.getByRole('button', { name: 'Salvar nova senha' }).click()
    await expect(page.getByText('Senha alterada com sucesso.')).toBeVisible()
  })

  test('carteiras: validação, conflito e persistência', async ({ page }) => {
    await goto(page, '/account/wallets')
    const primary = page.getByTestId('wallet-form-primary')
    const address = primary.getByLabel('Endereço da carteira')

    await address.fill('0x123')
    await primary.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(primary.getByText(/Endereço inválido/)).toBeVisible()

    // Endereço que pertence a outro colecionador → 409.
    await address.fill('0x1C3e5A7b9D1f3C5e7A9b1D3f5C7e9A1b3D5f7C90')
    await primary.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(primary.getByText('Endereço já vinculado a outra conta.')).toBeVisible()

    const valid = '0x9f8e7d6c5b4a39281706f5e4d3c2b1a098765432'
    await address.fill(valid)
    await primary.getByLabel('Nome da carteira').fill('Cofre')
    await primary.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(page.getByText('Carteira principal salva.')).toBeVisible()

    await page.reload()
    await expect(page.getByTestId('wallet-form-primary').getByLabel('Endereço da carteira')).toHaveValue(valid)
    await expect(page.getByTestId('wallet-form-primary').getByLabel('Nome da carteira')).toHaveValue('Cofre')
  })
})
