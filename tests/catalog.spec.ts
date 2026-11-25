import { expect, filterPanel, goto, isMobile, test } from './support/fixtures'

const cards = (page: import('@playwright/test').Page) => page.getByTestId('nft-card')

async function prices(page: import('@playwright/test').Page) {
  const texts = await page.getByTestId('nft-card-price').allInnerTexts()
  return texts.map((t) => Number.parseFloat(t))
}

test.describe('Catálogo', () => {
  test('busca, filtros combinados, ordenação, paginação e histórico', async ({ page }) => {
    await goto(page, '/')
    await expect(cards(page)).toHaveCount(9)

    // Paginação: vai para a página 2.
    await page.getByRole('button', { name: 'Página 2', exact: true }).click()
    await expect(page).toHaveURL(/page=2/)
    await expect(page.getByRole('button', { name: 'Página 2', exact: true })).toHaveAttribute('aria-current', 'page')

    // Filtro reinicia a paginação.
    let panel = await filterPanel(page)
    await panel.getByRole('button', { name: /^Música/ }).click()
    await expect(page).toHaveURL(/category=musica/)
    await expect(page).not.toHaveURL(/page=/)

    // Combinação com rede.
    panel = await filterPanel(page)
    await panel.getByRole('button', { name: /^Solana/ }).click()
    await expect(page).toHaveURL(/category=musica/)
    await expect(page).toHaveURL(/network=solana/)
    await expect(cards(page).first()).toBeVisible()

    // Busca textual (debounce) combinada.
    const search = page.getByRole('searchbox', { name: /Buscar NFTs/ }).first()
    await search.fill('golden')
    await expect(page).toHaveURL(/q=golden/)
    // Os cards exibidos são exatamente os que a API devolve para os parâmetros atuais
    // (toHaveText repete até a resposta nova substituir os dados anteriores).
    const expected = await page.evaluate(async () => {
      const r = await fetch('/api/nfts?q=golden&category=musica&network=solana&page=1&pageSize=9&sort=recent&tab=all')
      return ((await r.json()) as { items: { name: string }[] }).items.map((i) => i.name)
    })
    expect(expected.length).toBeGreaterThan(0)
    await expect(page.locator('[data-testid="nft-card"] h3')).toHaveText(expected)

    // Ordenação por menor preço.
    await page.getByLabel('Ordenar por:').selectOption('price-asc')
    await expect(page).toHaveURL(/sort=price-asc/)
    await expect.poll(async () => {
      const list = await prices(page)
      return list.every((p, i) => i === 0 || list[i - 1] <= p)
    }).toBe(true)

    // Histórico: voltar desfaz a ordenação; refresh preserva o estado.
    await page.goBack()
    await expect(page).not.toHaveURL(/sort=/)
    await expect(page).toHaveURL(/q=golden/)
    await page.reload()
    await expect(page).toHaveURL(/q=golden/)
    await expect(page).toHaveURL(/network=solana/)
    await expect(page.getByRole('searchbox', { name: /Buscar NFTs/ }).first()).toHaveValue('golden')
  })

  test('abas do catálogo filtram por novos lançamentos e em alta', async ({ page }) => {
    await goto(page, '/')
    await page.getByRole('button', { name: 'Em alta' }).click()
    await expect(page).toHaveURL(/tab=trending/)
    await expect(page.getByRole('button', { name: 'Em alta' })).toHaveAttribute('aria-pressed', 'true')
    await expect(cards(page).first()).toBeVisible()
  })

  test.describe('resultado vazio', () => {
    test.use({ scenario: 'empty' })
    test('mostra estado vazio', async ({ page }) => {
      await goto(page, '/')
      await expect(page.getByRole('heading', { name: 'Nenhum NFT encontrado' })).toBeVisible()
    })
  })

  test.describe('respostas fora de ordem', () => {
    test.use({ scenario: 'out-of-order' })
    test('a resposta atrasada não sobrescreve a consulta mais recente', async ({ page }) => {
      test.skip(isMobile(page), 'cenário validado no desktop')
      // Consultas do catálogo alternam: ímpares lentas (1,5 s), pares rápidas (100 ms).
      await goto(page, '/?category=musica') // #1 (lenta)
      await expect(cards(page).first()).toBeVisible()
      const panel = await filterPanel(page)
      await panel.getByRole('button', { name: /^Fotografia/ }).click() // #2 (rápida)
      await expect(page).toHaveURL(/category=fotografia/)
      await expect(cards(page).first()).toBeVisible()
      await panel.getByRole('button', { name: /^Arte 3D/ }).click() // #3 (lenta)
      await panel.getByRole('button', { name: /^Generativa/ }).click() // #4 (rápida) — chega antes da #3
      await expect(page).toHaveURL(/category=generativa/)
      await page.waitForTimeout(2000) // deixa a resposta antiga (#3) chegar
      await expect(page).toHaveURL(/category=generativa/)
      await expect(panel.getByRole('button', { name: /^Generativa/ })).toHaveAttribute('aria-pressed', 'true')
      // Os cards exibidos pertencem à consulta atual (generativa), não à antiga (arte-3d).
      const expected = await page.evaluate(async () => {
        const r = await fetch('/api/nfts?category=generativa&page=1&pageSize=9&sort=recent&tab=all')
        return ((await r.json()) as { items: { name: string }[] }).items.map((i) => i.name)
      })
      await expect(page.locator('[data-testid="nft-card"] h3')).toHaveText(expected)
    })
  })
})
