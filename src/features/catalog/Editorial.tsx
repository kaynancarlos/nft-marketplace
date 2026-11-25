import type { ReactElement } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function PromoBanners() {
  return (
    <section aria-label="Destaques do mercado" className="mt-20 grid gap-6 md:grid-cols-2">
      <PromoCard
        image="/images/emerald-ape.webp"
        title="Lançamentos gênesis de edição limitada"
        text="Colecione edições escassas diretamente dos criadores antes da revelação pública."
        link={<Link to="/" search={{ tab: 'new' }} hash="catalogo">Explorar<ArrowRight aria-hidden /></Link>}
      />
      <PromoCard
        image="/images/ivory-baron.webp"
        title="Arte digital selecionada e muito mais"
        text="Explore novos artistas, coleções verificadas e obras digitais que definem a cultura."
        link={<Link to="/" search={{ category: 'arte-digital' }} hash="catalogo">Explorar<ArrowRight aria-hidden /></Link>}
      />
    </section>
  )
}

function PromoCard({ image, title, text, link }: { image: string; title: string; text: string; link: ReactElement }) {
  return (
    <article className="grid grid-cols-[minmax(0,208px)_1fr] items-center overflow-hidden rounded-md bg-surface">
      <img src={image} alt="" width={400} height={400} loading="lazy" className="aspect-[208/180] h-full w-full rounded-[14px] object-cover" />
      <div className="flex flex-col items-end gap-3 p-4 text-right md:p-5">
        <h2 className="text-sm font-bold leading-snug md:text-[15px]">{title}</h2>
        <p className="text-xs leading-relaxed text-muted">{text}</p>
        <Button asChild size="sm" className="h-8">
          {link}
        </Button>
      </div>
    </article>
  )
}

const POSTS = [
  { image: '/images/ivory-baron.webp', date: '12 de setembro', read: '6 min', title: 'Como funciona a propriedade de NFTs', text: 'Aprenda a colecionar, negociar e verificar ativos digitais.' },
  { image: '/images/emerald-ape.webp', date: '13 de setembro', read: '2 min', title: '10 artistas digitais para acompanhar', text: 'Conheça criadores que moldam a cultura digital.' },
  { image: '/images/sage-nomad.webp', date: '15 de setembro', read: '3 min', title: 'Raridade, atributos e procedência', text: 'Entenda raridade, procedência, direitos autorais e utilidade.' },
  { image: '/images/golden-beat.webp', date: '15 de setembro', read: '2 min', title: 'Como proteger sua carteira', text: 'Proteja sua carteira, seus ativos e sua identidade.' },
]

export function Journal() {
  return (
    <section aria-labelledby="journal-title" className="mt-20">
      <div className="mb-8 text-center">
        <h2 id="journal-title" className="text-xl font-bold md:text-2xl">
          Diário da Cunhagem
        </h2>
        <p className="mt-3 text-xs text-muted">Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.</p>
      </div>
      <ul className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0">
        {POSTS.map((post) => (
          <li key={post.title} className="w-[70%] shrink-0 snap-start sm:w-[45%] md:w-auto">
            <article className="flex h-full flex-col overflow-hidden rounded-md bg-surface">
              <img src={post.image} alt="" width={400} height={400} loading="lazy" className="aspect-[194/140] w-full object-cover" />
              <div className="flex flex-1 flex-col gap-2 p-3">
                <p className="text-[10px] text-price">
                  {post.date} <span aria-hidden>|</span> Leitura de {post.read}
                </p>
                <h3 className="text-[13px] font-bold leading-snug">{post.title}</h3>
                <p className="text-[11px] text-muted">{post.text}</p>
                <Link
                  to="/em-breve/$section"
                  params={{ section: 'diario' }}
                  className="mt-auto text-[11px] font-semibold text-price hover:underline"
                  aria-label={`Ler mais: ${post.title}`}
                >
                  Ler mais →
                </Link>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  )
}
