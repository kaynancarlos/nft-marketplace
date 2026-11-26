import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import type { CategoryId } from '@/api/contracts'
import { SocialIcon, type SocialNetwork } from './SocialIcons'

const FEATURES = [
  { letter: 'W', title: 'Segurança da carteira', text: 'Proteja sua carteira e colecione arte digital verificada com confiança.' },
  { letter: 'C', title: 'Criadores em destaque', text: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.' },
  { letter: 'D', title: 'Alertas de lançamentos', text: 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.' },
]

type FooterLink =
  | { label: string; kind: 'route'; to: '/account/profile' | '/account/wallets' | '/account/favorites' }
  | { label: string; kind: 'section'; section: string }
  | { label: string; kind: 'category'; category: CategoryId }

const COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: 'Meu perfil',
    links: [
      { label: 'Meu perfil', kind: 'route', to: '/account/profile' },
      { label: 'Minha coleção', kind: 'section', section: 'colecao' },
      { label: 'Atividade', kind: 'section', section: 'atividade' },
      { label: 'Estúdio do criador', kind: 'section', section: 'estudio' },
      { label: 'Lista de interesse', kind: 'route', to: '/account/favorites' },
    ],
  },
  {
    title: 'Central de ajuda',
    links: [
      { label: 'Central de ajuda', kind: 'section', section: 'ajuda' },
      { label: 'Como comprar NFTs', kind: 'section', section: 'como-comprar' },
      { label: 'Carteira e segurança', kind: 'route', to: '/account/wallets' },
      { label: 'Política do mercado', kind: 'section', section: 'politica' },
      { label: 'Denunciar item', kind: 'section', section: 'denunciar' },
    ],
  },
  {
    title: 'Coleções',
    links: [
      { label: 'Arte digital', kind: 'category', category: 'arte-digital' },
      { label: 'Fotografia', kind: 'category', category: 'fotografia' },
      { label: 'Música', kind: 'category', category: 'musica' },
      { label: 'Arte 3D', kind: 'category', category: 'arte-3d' },
      { label: 'Utilidade', kind: 'category', category: 'utilidade' },
    ],
  },
]

const SOCIALS: { id: SocialNetwork; label: string }[] = [
  { id: 'facebook', label: 'Facebook' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'twitter', label: 'X (Twitter)' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'youtube', label: 'YouTube' },
]

const linkClass = 'text-xs text-foreground/90 hover:text-primary'

function FooterItem({ link }: { link: FooterLink }) {
  switch (link.kind) {
    case 'category':
      return (
        <Link to="/" search={{ category: link.category }} hash="catalogo" className={linkClass}>
          {link.label}
        </Link>
      )
    case 'route':
      return (
        <Link to={link.to} className={linkClass}>
          {link.label}
        </Link>
      )
    case 'section':
      return (
        <Link to="/em-breve/$section" params={{ section: link.section }} className={linkClass}>
          {link.label}
        </Link>
      )
  }
}

export function Footer() {
  const [email, setEmail] = useState('')
  return (
    <footer className="mx-auto mt-16 w-full max-w-[1264px] px-4 pb-24 md:px-8 md:pb-6 [body:has([data-mobile-buybar])_&]:pb-44 md:[body:has([data-mobile-buybar])_&]:pb-6">
      <div className="rounded-t-[var(--radius-card)] bg-surface">
        <div className="grid gap-8 px-6 py-8 md:grid-cols-4 md:gap-0">
          {FEATURES.map((f) => (
            <div key={f.letter} className="md:border-r md:border-line md:px-6 md:first:pl-2">
              <span className="mb-3 grid size-14 place-items-center rounded-full bg-primary text-lg font-bold text-primary-foreground" aria-hidden>
                {f.letter}
              </span>
              <h2 className="mb-2 text-sm font-bold">{f.title}</h2>
              <p className="text-xs leading-relaxed text-muted">{f.text}</p>
            </div>
          ))}
          <div className="md:pl-6">
            <h2 className="mb-3 text-sm font-bold">Antecipe-se ao próximo lançamento</h2>
            <form
              className="flex"
              onSubmit={(e) => {
                e.preventDefault()
                toast.info('A newsletter não faz parte desta demonstração. Nenhum e-mail foi cadastrado.')
              }}
            >
              <label htmlFor="newsletter-email" className="sr-only">
                Seu e-mail
              </label>
              <input
                id="newsletter-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="digite seu e-mail..."
                className="h-9 min-w-0 flex-1 rounded-l-md border border-r-0 border-line bg-band/40 px-3 text-xs placeholder:text-subtle"
              />
              <Button type="submit" size="sm" className="h-9 rounded-l-none">
                Enviar
              </Button>
            </form>
            <p className="mt-3 text-xs leading-relaxed text-muted">
              Receba lançamentos selecionados, histórias de criadores e novidades do mercado.
            </p>
          </div>
        </div>
        <div className="grid gap-2 bg-band px-6 py-5 text-xs sm:grid-cols-4 sm:items-center">
          <span className="font-bold tracking-[0.2em]">KURIO</span>
          <span>Feito para colecionadores, criadores e cultura</span>
          <span>contato@email.com</span>
          <span>+55 11 4002 8922</span>
        </div>
        <div className="grid gap-8 px-6 py-8 sm:grid-cols-2 md:grid-cols-4">
          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="mb-3 text-sm font-bold">{col.title}</h2>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <FooterItem link={link} />
                  </li>
                ))}
              </ul>
            </nav>
          ))}
          <div>
            <h2 className="mb-3 text-sm font-bold">Redes sociais</h2>
            <ul className="flex gap-2">
              {SOCIALS.map((s) => (
                <li key={s.id}>
                  <Link
                    to="/em-breve/$section"
                    params={{ section: 'redes-sociais' }}
                    aria-label={`Kurio no ${s.label} (indisponível na demonstração)`}
                    className="grid size-7 place-items-center rounded border border-primary text-primary hover:bg-primary/10"
                  >
                    <SocialIcon network={s.id} />
                  </Link>
                </li>
              ))}
            </ul>
            <h2 className="mb-2 mt-5 text-sm font-bold">Carteiras compatíveis</h2>
            <p className="inline-block rounded border border-line bg-band/60 px-2 py-1 text-[9px] font-bold tracking-wider text-primary">
              METAMASK · WALLETCONNECT · COINBASE
            </p>
          </div>
        </div>
      </div>
      <p className="py-4 text-center text-xs text-foreground/90">© 2026 Kurio. Propriedade digital para todos.</p>
    </footer>
  )
}
