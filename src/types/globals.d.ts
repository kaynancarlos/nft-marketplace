import type { KurioMockControl } from '../../mocks/control'

declare global {
  interface Window {
    /** Controle da API simulada (presente apenas com VITE_ENABLE_MOCKS=true). */
    __kurio?: KurioMockControl
  }

  interface ImportMetaEnv {
    readonly VITE_ENABLE_MOCKS?: string
    readonly VITE_API_URL?: string
    readonly VITE_SOCKET_URL?: string
    readonly VITE_MOCK_SCENARIO?: string
  }
}

export {}
