import { defineConfig, devices } from '@playwright/test'

/**
 * E2E contra o BUILD de demonstração (mocks ativos), servido pelo `vite preview`.
 * Cada teste usa um contexto novo do navegador → localStorage/sessionStorage
 * vazios → a API simulada começa do seed (estado isolado).
 */
const PORT = 4173
const baseURL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  // 1 retry: com muitos workers em paralelo, testes de tempo real podem oscilar.
  // O relatório marca como "flaky" qualquer teste que só passou na 2ª tentativa.
  retries: 1,
  workers: process.env.CI ? 2 : 4,
  timeout: 45_000,
  expect: {
    timeout: 8_000,
    toHaveScreenshot: { maxDiffPixelRatio: 0.02, animations: 'disabled', caret: 'hide' },
  },
  reporter: [['list'], ['html', { outputFolder: 'reports/playwright', open: 'never' }]],
  snapshotPathTemplate: '{testDir}/__screenshots__/{projectName}/{testFilePath}/{arg}{ext}',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    serviceWorkers: 'allow',
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } },
      // Fluxos principais também no mobile.
      testMatch: /(catalog|detail|cart|checkout|visual|auth)\.spec\.ts/,
    },
  ],
  webServer: {
    command: 'npm run build:demo && npm run preview',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
