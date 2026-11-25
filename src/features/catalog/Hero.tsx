import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const SLIDES = [
  { image: '/images/emerald-ape.webp', alt: 'Emerald Ape #042: macaco de óculos redondos e jaqueta college verde' },
  { image: '/images/ivory-baron.webp', alt: 'Ivory Baron #088: macaco de gola alta verde e blazer marfim' },
  { image: '/images/golden-beat.webp', alt: 'Golden Beat #207: macaco dourado com fones de ouvido verdes' },
]

function scrollToCatalog() {
  const el = document.getElementById('catalogo')
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  el?.focus({ preventScroll: true })
}

export function Hero() {
  const [index, setIndex] = useState(0)
  const slide = SLIDES[index]

  return (
    <section aria-labelledby="hero-title" className="relative mt-4 md:mt-6">
      <div className="relative grid items-center gap-4 overflow-hidden rounded-[var(--radius-card)] bg-gradient-to-br from-[#3a2418] to-[#1d130f] p-4 md:grid-cols-[1fr_minmax(0,300px)] md:gap-10 md:rounded-none md:bg-none md:p-0 md:pl-7 lg:grid-cols-[1fr_450px] lg:pl-10">
        <div className="relative z-10 max-w-[62%] md:max-w-none">
          <p className="mb-2 text-[11px] font-semibold md:mb-5 md:text-xs lg:text-[13px]">Bem-vindo à Kurio</p>
          <h1 id="hero-title" className="text-lg font-bold uppercase leading-tight md:text-[34px] md:leading-[1.5] lg:text-[44px] lg:leading-[1.58]">
            <span className="md:hidden">Seja dono da cultura digital</span>
            <span className="hidden md:inline">
              Seja dono do futuro
              <br />
              da arte digital
            </span>
          </h1>
          <p className="mt-2 text-[11px] leading-relaxed text-muted md:mt-3 md:max-w-md md:text-xs md:leading-[1.9] lg:max-w-[560px] lg:text-sm lg:leading-[1.8]">
            <span className="md:hidden">Descubra NFTs selecionados de criadores do mundo todo.</span>
            <span className="hidden md:inline">
              Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e
              tenha uma parte da cultura da internet.
            </span>
          </p>
          <Button onClick={scrollToCatalog} className="mt-4 h-8 px-0 text-[11px] uppercase text-primary md:mt-7 md:h-9 md:w-[102px] md:bg-primary md:px-4 md:text-xs lg:mt-9 lg:h-10 lg:w-[140px] lg:text-sm md:text-primary-foreground bg-transparent hover:bg-transparent md:hover:bg-primary-hover">
            Explorar
            <ArrowRight className="md:hidden" aria-hidden />
          </Button>
        </div>

        <div className="absolute right-3 top-1/2 w-[38%] -translate-y-1/2 md:static md:w-full md:translate-y-0">
          <img
            src={slide.image}
            alt={slide.alt}
            width={400}
            height={400}
            fetchPriority="high"
            className="aspect-square w-full rounded-[14px] object-cover md:rounded-[18px] lg:rounded-[22px]"
          />
        </div>

        <div className="relative z-10 flex gap-1.5 md:absolute md:bottom-4 md:right-[340px] lg:right-[540px]" role="group" aria-label="Destaques">
          {SLIDES.map((s, i) => (
            <button
              key={s.image}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Mostrar destaque ${i + 1} de ${SLIDES.length}`}
              aria-pressed={i === index}
              className={cn('size-2 rounded-full bg-primary/50 transition-colors', i === index && 'bg-primary')}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
