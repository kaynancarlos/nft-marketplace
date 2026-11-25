import '@fontsource-variable/roboto-mono'
import './styles/index.css'

/**
 * Ordem de boot importa:
 *  1. Se VITE_ENABLE_MOCKS=true, inicia o MSW (REST + WebSocket) ANTES de
 *     carregar a aplicação. O engine.io-client guarda a referência do
 *     construtor WebSocket ao ser importado; carregando o app depois do
 *     `worker.start()`, ele já recebe a versão interceptada pelo MSW.
 *  2. Importa e monta a aplicação.
 */
async function enableMocking() {
  if (import.meta.env.VITE_ENABLE_MOCKS !== 'true') return
  const { startMocks } = await import('../mocks/browser')
  await startMocks()
}

enableMocking()
  .catch((error) => {
    console.error('Falha ao iniciar os mocks', error)
  })
  .then(() => import('./app/bootstrap'))
  .then(({ mount }) => mount(document.getElementById('root')!))
