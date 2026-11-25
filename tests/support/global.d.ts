import type { KurioMockControl } from '../../mocks/control'

declare global {
  interface Window {
    __kurio?: KurioMockControl
  }
}

export {}
