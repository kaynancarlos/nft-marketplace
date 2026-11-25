import { useSyncExternalStore } from 'react'

/**
 * Estado observável do tempo real:
 *  - status da conexão (para o indicador e para os testes);
 *  - avisos de alteração de preço/disponibilidade de itens do carrinho,
 *    exibidos no carrinho e no checkout até o usuário dispensar.
 */

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'offline'

export interface CartNotice {
  id: string
  nftId: string
  message: string
}

interface State {
  status: ConnectionStatus
  notices: CartNotice[]
}

let state: State = { status: 'idle', notices: [] }
const listeners = new Set<() => void>()

function emit(next: State) {
  state = next
  for (const l of listeners) l()
}

export const realtimeStore = {
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  get: () => state,
  setStatus(status: ConnectionStatus) {
    if (state.status !== status) emit({ ...state, status })
  },
  pushNotice(notice: CartNotice) {
    // Um aviso por NFT: o mais recente substitui o anterior.
    emit({ ...state, notices: [...state.notices.filter((n) => n.nftId !== notice.nftId), notice] })
  },
  dismiss(id: string) {
    emit({ ...state, notices: state.notices.filter((n) => n.id !== id) })
  },
  clearNotices() {
    if (state.notices.length) emit({ ...state, notices: [] })
  },
}

export function useRealtimeState() {
  return useSyncExternalStore(realtimeStore.subscribe, realtimeStore.get, realtimeStore.get)
}
