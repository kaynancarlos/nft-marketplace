import { lazy, Suspense } from 'react'
import { Outlet } from '@tanstack/react-router'
import { Toaster } from 'sonner'
import { SessionEffects } from '@/app/SessionEffects'
import { RealtimeProvider } from '@/realtime/RealtimeProvider'
import { Footer } from './Footer'
import { Header } from './Header'
import { MobileNav } from './MobileNav'

const MockPanel = lazy(() => import('@/features/dev/MockPanel').then((m) => ({ default: m.MockPanel })))

export function RootLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Pular para o conteúdo
      </a>
      <Header />
      <main id="conteudo" tabIndex={-1} className="mx-auto w-full max-w-[1264px] flex-1 px-4 outline-none md:px-8">
        <Outlet />
      </main>
      <Footer />
      <MobileNav />
      <SessionEffects />
      <RealtimeProvider />
      <Toaster
        theme="dark"
        position="top-right"
        closeButton
        toastOptions={{
          classNames: {
            toast: '!bg-surface-2 !border-line !text-foreground font-sans',
            description: '!text-muted',
          },
        }}
        containerAriaLabel="Notificações"
      />
      {import.meta.env.VITE_ENABLE_MOCKS === 'true' && (
        <Suspense fallback={null}>
          <MockPanel />
        </Suspense>
      )}
    </div>
  )
}
