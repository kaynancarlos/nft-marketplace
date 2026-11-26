import { useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react'
import { FlaskConical } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogDescription, DialogTitle, DialogTrigger, SheetContent } from '@/components/ui/dialog'
import { Input, NativeSelect } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCart } from '@/queries/cart'

/**
 * Painel de cenários da demonstração (só existe com VITE_ENABLE_MOCKS=true).
 * Ele NÃO altera a interface diretamente: chama o controle do servidor
 * simulado (window.__kurio), que muda o estado e emite os eventos pelo
 * Socket.IO — a UI reage pelos mesmos canais de produção.
 */
export function MockPanel() {
  const control = window.__kurio
  const { data: cart } = useCart()
  const [nftId, setNftId] = useState('')
  const [open, setOpen] = useState(false)
  const tab = useDraggableTab()

  if (!control) return null

  const target = nftId || cart?.items[0]?.nftId || 'emerald-ape-042'

  function run(label: string, fn: () => unknown) {
    try {
      fn()
      toast.info(`Simulação: ${label}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error))
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        {...tab.handlers}
        style={{ '--tab-top': `${tab.top * 100}%` } as CSSProperties}
        className="fixed left-0 top-[var(--tab-top)] z-30 flex -translate-y-1/2 items-center gap-1.5 rounded-r-full border border-l-0 border-line bg-surface-2 py-2 pl-2 pr-3 text-[11px] font-semibold shadow-lg hover:border-primary max-md:touch-none max-md:select-none md:bottom-4 md:left-3 md:top-auto md:translate-y-0 md:rounded-full md:border-l md:px-3"
        aria-label="Abrir painel de cenários da demonstração"
        aria-describedby="mock-tab-hint"
      >
        <FlaskConical className="size-3.5 text-primary" aria-hidden />
        <span className="hidden md:inline">Cenários</span>
      </DialogTrigger>
      <span id="mock-tab-hint" className="sr-only">
        No celular, arraste para cima ou para baixo para mudar a posição. Pelo teclado, use as setas.
      </span>
      <SheetContent side="right" className="text-xs">
        <DialogTitle className="text-base">Cenários da API simulada</DialogTitle>
        <DialogDescription className="text-xs">
          Ferramenta de demonstração. As ações alteram o servidor simulado (MSW) e chegam à interface por REST e Socket.IO.
        </DialogDescription>

        <div className="space-y-1.5">
          <Label htmlFor="mock-scenario">Cenário de rede/negócio</Label>
          <NativeSelect
            id="mock-scenario"
            defaultValue={control.getScenario()}
            onChange={(e) => {
              control.setScenario(e.target.value as Parameters<typeof control.setScenario>[0])
              window.location.reload()
            }}
          >
            {control.scenarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </NativeSelect>
          <p className="text-[11px] text-subtle">{control.scenarios.find((s) => s.id === control.getScenario())?.description}</p>
        </div>

        <Button
          variant="outline"
          onClick={() => {
            control.reset()
            control.setScenario('default')
            window.location.assign('/')
          }}
        >
          Resetar dados (cenário conhecido)
        </Button>

        <fieldset className="space-y-2 border-t border-line pt-4">
          <legend className="text-sm font-bold">Tempo real</legend>
          <div className="space-y-1.5">
            <Label htmlFor="mock-nft">NFT alvo (padrão: 1º item do carrinho)</Label>
            <Input id="mock-nft" value={nftId} placeholder={target} onChange={(e) => setNftId(e.target.value.trim())} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" variant="secondary" onClick={() => run('preço +0.10 ETH', () => control.changePrice(target, '0.10'))}>
              Alterar preço
            </Button>
            <Button size="sm" variant="secondary" onClick={() => run('edições esgotadas', () => control.setAvailability(target, 0))}>
              Esgotar NFT
            </Button>
            <Button size="sm" variant="secondary" onClick={() => run('evento duplicado', () => control.replayLastEvent())}>
              Duplicar evento
            </Button>
            <Button size="sm" variant="secondary" onClick={() => run('evento antigo', () => control.emitStaleNftEvent(target))}>
              Evento antigo
            </Button>
            <Button size="sm" variant="secondary" onClick={() => run('queda de conexão (5 s)', () => control.dropSockets(5000))}>
              Derrubar socket
            </Button>
            <Button size="sm" variant="secondary" onClick={() => run('sessões expiradas', () => control.expireSessions())}>
              Expirar sessão
            </Button>
          </div>
        </fieldset>
      </SheetContent>
    </Dialog>
  )
}

const TAB_KEY = 'kurio:mock-tab-top'
const MIN = 0.12
const MAX = 0.8
const clamp = (v: number) => Math.min(MAX, Math.max(MIN, v))

function readTop() {
  try {
    const saved = Number(localStorage.getItem(TAB_KEY))
    return saved ? clamp(saved) : 0.42
  } catch {
    return 0.42
  }
}

function saveTop(top: number) {
  try {
    localStorage.setItem(TAB_KEY, String(top))
  } catch {
    /* armazenamento indisponível: a posição vale só nesta visita */
  }
}

/**
 * Aba lateral do mobile que pode ser arrastada para cima ou para baixo (como a
 * aba de atalhos do celular), para não cobrir o conteúdo. Toque curto abre o
 * painel; arrastar só move. A posição fica salva no navegador. No desktop o
 * botão fica fixo no canto e não arrasta.
 */
function useDraggableTab() {
  const [top, setTop] = useState(readTop)
  const drag = useRef<{ startY: number; startTop: number; moved: boolean } | null>(null)
  const suppressClick = useRef(false)
  const isDesktop = () => window.matchMedia('(min-width: 768px)').matches

  const move = (next: number) => {
    const value = clamp(next)
    setTop(value)
    saveTop(value)
  }

  return {
    top,
    handlers: {
      onPointerDown(event: PointerEvent<HTMLButtonElement>) {
        if (isDesktop() || event.button !== 0) return
        drag.current = { startY: event.clientY, startTop: top, moved: false }
        event.currentTarget.setPointerCapture(event.pointerId)
      },
      onPointerMove(event: PointerEvent<HTMLButtonElement>) {
        const state = drag.current
        if (!state) return
        const dy = event.clientY - state.startY
        if (!state.moved && Math.abs(dy) < 6) return
        state.moved = true
        setTop(clamp(state.startTop + dy / window.innerHeight))
      },
      onPointerUp(event: PointerEvent<HTMLButtonElement>) {
        const state = drag.current
        drag.current = null
        if (!state?.moved) return
        suppressClick.current = true
        move(state.startTop + (event.clientY - state.startY) / window.innerHeight)
      },
      onPointerCancel() {
        drag.current = null
      },
      onClick(event: MouseEvent<HTMLButtonElement>) {
        // Depois de arrastar, o "clique" que o navegador dispara não abre o painel.
        if (suppressClick.current) {
          suppressClick.current = false
          event.preventDefault()
        }
      },
      onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
        if (isDesktop()) return
        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
          event.preventDefault()
          move(top + (event.key === 'ArrowUp' ? -0.05 : 0.05))
        }
      },
    },
  }
}
