import { Link, useParams } from '@tanstack/react-router'
import { Construction } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePageTitle } from '@/lib/usePageTitle'

const TITLES: Record<string, string> = {
  criadores: 'Criadores',
  aprenda: 'Aprenda',
  diario: 'Diário da Cunhagem',
  colecao: 'Minha coleção',
  atividade: 'Atividade',
  estudio: 'Estúdio do criador',
  ajuda: 'Central de ajuda',
  'como-comprar': 'Como comprar NFTs',
  politica: 'Política do mercado',
  denunciar: 'Denunciar item',
  'redes-sociais': 'Redes sociais',
  ofertas: 'Ofertas',
  downloads: 'Downloads',
  suporte: 'Suporte',
}

/**
 * Seções editoriais/auxiliares fora do escopo do desafio. A página deixa
 * claro que nada foi executado — sem aparentar sucesso funcional.
 */
export function ComingSoonPage() {
  const { section } = useParams({ from: '/em-breve/$section' })
  const title = TITLES[section] ?? 'Seção'
  usePageTitle(title)
  return (
    <section className="mx-auto flex max-w-lg flex-col items-center gap-4 py-24 text-center">
      <Construction className="size-10 text-primary" aria-hidden />
      <h1 className="text-xl font-bold">{title}</h1>
      <p className="text-sm text-muted">
        Esta seção não faz parte desta demonstração do marketplace. Nenhuma ação foi realizada.
      </p>
      <Button asChild variant="outline">
        <Link to="/" hash="catalogo">
          Explorar o mercado
        </Link>
      </Button>
    </section>
  )
}
