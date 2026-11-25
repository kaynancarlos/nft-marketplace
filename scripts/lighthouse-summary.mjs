#!/usr/bin/env node
/**
 * Lê os relatórios JSON do Lighthouse CI (reports/lighthouse/<perfil>/*.json),
 * agrupa por página e calcula a MEDIANA de cada categoria e de LCP, CLS e TBT.
 * Gera reports/lighthouse/summary.md e summary.json.
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { execSync } from 'node:child_process'
import os from 'node:os'

const ROOT = 'reports/lighthouse'
const PROFILES = ['mobile', 'desktop']
const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo']
const TARGETS = { performance: 90, accessibility: 95, 'best-practices': 95, seo: 90 }

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

const summary = { generatedAt: new Date().toISOString(), environment: {}, results: [] }
let lighthouseVersion = 'n/d'
let chromeVersion = 'n/d'

for (const profile of PROFILES) {
  const dir = join(ROOT, profile)
  if (!existsSync(dir)) continue
  const files = readdirSync(dir).filter((f) => f.endsWith('.json') && !f.startsWith('manifest'))
  const byUrl = new Map()
  for (const file of files) {
    const lhr = JSON.parse(readFileSync(join(dir, file), 'utf8'))
    if (!lhr.categories) continue
    lighthouseVersion = lhr.lighthouseVersion ?? lighthouseVersion
    chromeVersion = lhr.environment?.hostUserAgent ?? chromeVersion
    const url = new URL(lhr.finalDisplayedUrl ?? lhr.finalUrl).pathname
    const runs = byUrl.get(url) ?? []
    runs.push(lhr)
    byUrl.set(url, runs)
  }
  for (const [url, runs] of byUrl) {
    const row = { profile, url, runs: runs.length }
    for (const c of CATEGORIES) row[c] = Math.round(median(runs.map((r) => (r.categories[c]?.score ?? 0) * 100)))
    row.lcpMs = Math.round(median(runs.map((r) => r.audits['largest-contentful-paint'].numericValue)))
    row.cls = Number(median(runs.map((r) => r.audits['cumulative-layout-shift'].numericValue)).toFixed(3))
    row.tbtMs = Math.round(median(runs.map((r) => r.audits['total-blocking-time'].numericValue)))
    summary.results.push(row)
  }
}

let npmVersion = 'n/d'
try {
  npmVersion = execSync('npm -v').toString().trim()
} catch {
  /* ignora */
}
summary.environment = {
  lighthouse: lighthouseVersion,
  chrome: chromeVersion,
  node: process.version,
  npm: npmVersion,
  os: `${os.type()} ${os.release()} (${os.arch()})`,
  cpu: os.cpus()[0]?.model ?? 'n/d',
  memoryGb: Math.round(os.totalmem() / 1024 ** 3),
  build: 'npm run build:demo (vite build, mocks ativos, cenário default)',
  server: 'vite preview (porta 4173)',
}

const ok = (c, v) => (v >= TARGETS[c] ? `${v}` : `**${v}** ⚠️`)
const lines = [
  '# Lighthouse — mediana de 3 execuções',
  '',
  `Gerado em ${summary.generatedAt}`,
  '',
  '| Perfil | Página | Perf. | A11y | Best Pr. | SEO | LCP (ms) | CLS | TBT (ms) |',
  '|---|---|---|---|---|---|---|---|---|',
  ...summary.results.map(
    (r) =>
      `| ${r.profile} | ${r.url} | ${ok('performance', r.performance)} | ${ok('accessibility', r.accessibility)} | ${ok('best-practices', r['best-practices'])} | ${ok('seo', r.seo)} | ${r.lcpMs} | ${r.cls} | ${r.tbtMs} |`,
  ),
  '',
  '## Ambiente',
  '',
  ...Object.entries(summary.environment).map(([k, v]) => `- **${k}**: ${v}`),
  '',
  'Metas: Performance ≥ 90 · Accessibility ≥ 95 · Best Practices ≥ 95 · SEO ≥ 90.',
  summary.results.some((r) => CATEGORIES.some((c) => r[c] < TARGETS[c]))
    ? 'Há valores abaixo da meta (marcados com ⚠️) — ver justificativas no ARCHITECTURE.md.'
    : 'Todas as categorias atingiram as metas em todas as páginas e perfis. ✅',
]
writeFileSync(join(ROOT, 'summary.md'), lines.join('\n'))
writeFileSync(join(ROOT, 'summary.json'), JSON.stringify(summary, null, 2))
console.log(lines.join('\n'))
