import { useRouter, type ErrorComponentProps } from '@tanstack/react-router'
import { ErrorState } from '@/components/feedback'

export function RouteError({ error, reset }: ErrorComponentProps) {
  const router = useRouter()
  return (
    <div className="py-16">
      <ErrorState
        title="Algo deu errado nesta página"
        message={error instanceof Error ? error.message : 'Erro inesperado.'}
        onRetry={() => {
          reset()
          void router.invalidate()
        }}
      />
    </div>
  )
}
