import { useEffect } from 'react'
import type { ErrorComponentProps } from '@tanstack/react-router'
import { ErrorState } from '@/components/feedback'

/**
 * Erro inesperado ao renderizar uma página. "Tentar novamente" recarrega a
 * página inteira: um erro de renderização costuma vir de um estado em memória
 * (cache, versão antiga do site aberta durante um deploy), e só reiniciar o
 * componente o repetiria. O erro vai para o console para facilitar o diagnóstico.
 */
export function RouteError({ error }: ErrorComponentProps) {
  useEffect(() => {
    console.error('[Kurio] Erro ao renderizar a página:', error)
  }, [error])

  return (
    <div className="py-16">
      <ErrorState
        title="Algo deu errado nesta página"
        message={error instanceof Error ? error.message : 'Erro inesperado.'}
        onRetry={() => window.location.reload()}
      />
    </div>
  )
}
