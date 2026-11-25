/**
 * Lighthouse CI — perfil MOBILE (padrão do Lighthouse: Moto G Power, 4G lento,
 * CPU 4x). Build otimizado de demonstração com o cenário padrão dos mocks.
 * 3 medições por página; a mediana é calculada por scripts/lighthouse-summary.mjs.
 */
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run preview',
      startServerReadyPattern: 'Local',
      url: ['http://localhost:4173/', 'http://localhost:4173/nft/emerald-ape-042'],
      numberOfRuns: 3,
      settings: {
        formFactor: 'mobile',
        // O cenário padrão já é o default do build; limpar o storage garante o seed.
        disableStorageReset: false,
        chromeFlags: '--no-sandbox --headless=new',
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.9 }],
        'categories:accessibility': ['warn', { minScore: 0.95 }],
        'categories:best-practices': ['warn', { minScore: 0.95 }],
        'categories:seo': ['warn', { minScore: 0.9 }],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: './reports/lighthouse/mobile',
      reportFilenamePattern: '%%PATHNAME%%-%%DATETIME%%-report.%%EXTENSION%%',
    },
  },
}
