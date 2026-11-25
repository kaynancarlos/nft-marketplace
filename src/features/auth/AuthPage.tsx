import { forwardRef, useEffect, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { useForm, type FieldValues, type Path, type UseFormSetError } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { getRouteApi, Link, useRouter } from '@tanstack/react-router'
import { Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { isApiError } from '@/api/client'
import { loginSchema, registerSchema, type LoginForm, type RegisterForm } from '@/api/schemas'
import { useAuth } from '@/auth/authStore'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Hero } from '@/features/catalog/Hero'
import { usePageTitle } from '@/lib/usePageTitle'
import { useLogin, useRegister } from '@/queries/auth'

const loginRoute = getRouteApi('/login')
const registerRoute = getRouteApi('/register')

function applyServerErrors<T extends FieldValues>(error: unknown, setError: UseFormSetError<T>): string {
  if (!isApiError(error)) return 'Algo deu errado. Tente novamente.'
  for (const [field, message] of Object.entries(error.fields)) {
    setError(field as Path<T>, { type: 'server', message })
  }
  return error.message
}

/** Desktop: modal sobre a página inicial (Figma). Mobile: tela cheia. */
function AuthShell({
  title,
  mode,
  redirect,
  children,
  onClose,
}: {
  title: string
  mode: 'login' | 'register'
  redirect?: string
  children: ReactNode
  onClose: () => void
}) {
  return (
    <>
      <div aria-hidden inert className="pointer-events-none hidden opacity-60 md:block">
        <Hero />
      </div>
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent
          className="h-dvh max-h-dvh w-full max-w-none rounded-none border-0 px-6 py-10 md:h-auto md:max-h-[92dvh] md:w-[500px] md:rounded-[var(--radius-card)] md:border md:border-b-4 md:border-b-primary md:px-12 md:py-9"
          onInteractOutside={(e) => e.preventDefault()}
          closeLabel="Fechar e voltar"
        >
          <p className="text-center text-2xl font-bold tracking-[0.15em] md:hidden">KURIO</p>
          {/* Desktop (Figma): abas "Entrar | Criar conta". */}
          <nav aria-label="Acesso à conta" className="hidden items-center justify-center gap-2 text-base font-bold md:flex">
            {mode === 'login' ? (
              <span className="text-primary" aria-current="page">
                Entrar
              </span>
            ) : (
              <Link to="/login" search={{ redirect }} className="hover:text-primary">
                Entrar
              </Link>
            )}
            <span aria-hidden className="text-subtle">
              |
            </span>
            {mode === 'register' ? (
              <span className="text-primary" aria-current="page">
                Criar conta
              </span>
            ) : (
              <Link to="/register" search={{ redirect }} className="hover:text-primary">
                Criar conta
              </Link>
            )}
          </nav>
          <DialogTitle className="mt-10 text-center text-base md:sr-only">{title}</DialogTitle>
          {children}
        </DialogContent>
      </Dialog>
    </>
  )
}

function DemoHint() {
  if (import.meta.env.VITE_ENABLE_MOCKS !== 'true') return null
  return (
    <p className="rounded-md border border-line bg-surface-2 px-3 py-2 text-[11px] text-muted">
      Demonstração: <strong>ana@kurio.dev</strong> ou <strong>bruno@kurio.dev</strong>, senha <strong>Kurio@123</strong>
    </p>
  )
}

function SocialButtons() {
  const unavailable = () => toast.info('Login social não está disponível nesta demonstração. Use e-mail e senha.')
  const btn =
    'flex h-9 w-full items-center justify-center gap-2.5 rounded-md border border-line bg-transparent text-xs text-muted transition-colors hover:border-primary hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary'
  return (
    <div className="space-y-3">
      <p className="flex items-center gap-3 text-[11px] text-foreground before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">
        Ou continue com
      </p>
      <button type="button" className={btn} onClick={unavailable} aria-describedby="social-note">
        <GoogleIcon /> Continuar com Google
      </button>
      <button type="button" className={btn} onClick={unavailable} aria-describedby="social-note">
        <FacebookIcon /> Continuar com Facebook
      </button>
      <p id="social-note" className="sr-only">
        Indisponível nesta demonstração.
      </p>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px] shrink-0" aria-hidden>
      <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.81Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3.01c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.11A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.29 14.28A7.2 7.2 0 0 1 4.91 12c0-.79.14-1.56.38-2.28V6.61H1.28a12 12 0 0 0 0 10.78l4.01-3.11Z" />
      <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.28 6.61l4.01 3.11C6.23 6.88 8.88 4.77 12 4.77Z" />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px] shrink-0" aria-hidden>
      <path
        fill="#1877F2"
        d="M13.4 22v-8.2h2.76l.41-3.2H13.4V8.56c0-.93.26-1.56 1.59-1.56h1.7V4.14A22.7 22.7 0 0 0 14.2 4c-2.45 0-4.13 1.5-4.13 4.25v2.35H7.3v3.2h2.77V22h3.33Z"
      />
    </svg>
  )
}

export const PasswordInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { toggleLabel: string }>(
  function PasswordInput({ toggleLabel, ...rest }, ref) {
    const [visible, setVisible] = useState(false)
    return (
      <div className="relative">
        <Input ref={ref} {...rest} type={visible ? 'text' : 'password'} className="pr-10" />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-subtle hover:text-foreground"
          aria-label={visible ? `Ocultar ${toggleLabel}` : `Mostrar ${toggleLabel}`}
          aria-pressed={visible}
        >
          {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
        </button>
      </div>
    )
  },
)

export function LoginPage() {
  usePageTitle('Entrar')
  const search = loginRoute.useSearch()
  const router = useRouter()
  const { user } = useAuth()
  const login = useLogin()
  const [formError, setFormError] = useState<string | null>(null)
  const redirectTo = search.redirect ?? '/'

  const { register, handleSubmit, formState, setError } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
  })

  useEffect(() => {
    if (user && !login.isPending) router.history.replace(redirectTo)
  }, [user, login.isPending, redirectTo, router])

  const onSubmit = handleSubmit((values) => {
    setFormError(null)
    login.mutate(values, {
      onSuccess: () => router.history.replace(redirectTo),
      onError: (error) => setFormError(applyServerErrors(error, setError)),
    })
  })

  return (
    <AuthShell title="Entrar" mode="login" redirect={search.redirect} onClose={() => router.history.push(redirectTo.startsWith('/checkout') ? '/cart' : '/')}>
      <DialogDescription className="text-center text-xs">Entre para gerenciar seu portfólio, coleção e perfil de criador.</DialogDescription>
      {search.reason === 'expired' && (
        <p role="alert" className="rounded-md border border-primary/60 bg-primary/10 px-3 py-2 text-xs" data-testid="session-expired-notice">
          Sua sessão expirou. Entre novamente para continuar de onde parou.
        </p>
      )}
      <form noValidate onSubmit={onSubmit} className="space-y-3">
        <Field id="login-email" label="E-mail" hideLabel error={formState.errors.email?.message}>
          {(a) => <Input {...a} type="email" autoComplete="email" placeholder="contato@email.com" {...register('email')} />}
        </Field>
        <Field id="login-password" label="Senha" hideLabel error={formState.errors.password?.message}>
          {(a) => <PasswordInput {...a} toggleLabel="senha" placeholder="Senha" autoComplete="current-password" {...register('password')} />}
        </Field>
        <div className="text-right">
          <button
            type="button"
            className="text-[11px] text-primary hover:underline"
            onClick={() => toast.info('A recuperação de senha não faz parte desta demonstração.')}
          >
            Esqueceu a senha?
          </button>
        </div>
        {formError && (
          <p role="alert" className="text-xs text-danger" data-testid="login-error">
            {formError}
          </p>
        )}
        <Button type="submit" className="h-11 w-full md:h-9" loading={login.isPending}>
          Entrar
        </Button>
      </form>
      <DemoHint />
      <SocialButtons />
      <p className="text-center text-xs">
        Novo na Kurio?{' '}
        <Link to="/register" search={{ redirect: search.redirect }} className="text-primary hover:underline">
          Crie uma conta
        </Link>
      </p>
    </AuthShell>
  )
}

export function RegisterPage() {
  usePageTitle('Criar conta')
  const search = registerRoute.useSearch()
  const router = useRouter()
  const { user } = useAuth()
  const registerMutation = useRegister()
  const [formError, setFormError] = useState<string | null>(null)
  const redirectTo = search.redirect ?? '/'

  const { register, handleSubmit, formState, setError } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur',
  })

  useEffect(() => {
    if (user && !registerMutation.isPending) router.history.replace(redirectTo)
  }, [user, registerMutation.isPending, redirectTo, router])

  const onSubmit = handleSubmit(({ username, email, password }) => {
    setFormError(null)
    registerMutation.mutate(
      { username, email, password },
      {
        onSuccess: () => router.history.replace(redirectTo),
        onError: (error) => setFormError(applyServerErrors(error, setError)),
      },
    )
  })

  return (
    <AuthShell title="Criar perfil de colecionador" mode="register" redirect={search.redirect} onClose={() => router.history.push('/')}>
      <DialogDescription className="text-center text-xs">Crie sua conta para colecionar, favoritar e comprar NFTs.</DialogDescription>
      <form noValidate onSubmit={onSubmit} className="space-y-3">
        <Field id="register-username" label="Nome de usuário" hideLabel error={formState.errors.username?.message}>
          {(a) => <Input {...a} placeholder="Nome de usuário" autoComplete="username" {...register('username')} />}
        </Field>
        <Field id="register-email" label="E-mail" hideLabel error={formState.errors.email?.message}>
          {(a) => <Input {...a} type="email" placeholder="Digite seu e-mail" autoComplete="email" {...register('email')} />}
        </Field>
        <Field id="register-password" label="Senha" hideLabel error={formState.errors.password?.message} hint="Mínimo de 8 caracteres, com letras e números.">
          {(a) => <PasswordInput {...a} toggleLabel="senha" placeholder="Senha" autoComplete="new-password" {...register('password')} />}
        </Field>
        <Field id="register-confirm" label="Confirmar senha" hideLabel error={formState.errors.confirmPassword?.message}>
          {(a) => <PasswordInput {...a} toggleLabel="confirmação de senha" placeholder="Confirmar senha" autoComplete="new-password" {...register('confirmPassword')} />}
        </Field>
        {formError && (
          <p role="alert" className="text-xs text-danger" data-testid="register-error">
            {formError}
          </p>
        )}
        <Button type="submit" className="h-11 w-full md:h-9" loading={registerMutation.isPending}>
          Criar perfil
        </Button>
      </form>
      <SocialButtons />
      <p className="text-center text-xs">
        Já tem uma conta?{' '}
        <Link to="/login" search={{ redirect: search.redirect }} className="text-primary hover:underline">
          Entre
        </Link>
      </p>
    </AuthShell>
  )
}