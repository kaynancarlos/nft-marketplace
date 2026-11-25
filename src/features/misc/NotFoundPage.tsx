import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { usePageTitle } from '@/lib/usePageTitle'

export function NotFoundPage() {
  usePageTitle('Página não encontrada')
  return (
    <section className="mx-auto flex max-w-lg flex-col items-center gap-4 py-24 text-center">
      <p className="text-5xl font-bold text-primary">404</p>
      <h1 className="text-xl font-bold">Página não encontrada</h1>
      <p className="text-sm text-muted">O endereço que você acessou não existe ou foi movido.</p>
      <Button asChild>
        <Link to="/">Voltar para o início</Link>
      </Button>
    </section>
  )
}
