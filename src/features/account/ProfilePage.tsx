import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Upload } from 'lucide-react'
import { toast } from 'sonner'
import { isApiError } from '@/api/client'
import { passwordChangeSchema, profileSchema, type PasswordChangeForm, type ProfileForm } from '@/api/schemas'
import { ErrorState } from '@/components/feedback'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/misc'
import { PasswordInput } from '@/features/auth/AuthPage'
import { usePageTitle } from '@/lib/usePageTitle'
import { useChangePassword, useProfile, useRemoveAvatar, useUpdateProfile, useUploadAvatar } from '@/queries/account'
import type { User } from '@/api/contracts'

export function ProfilePage() {
  usePageTitle('Perfil do colecionador')
  const profile = useProfile()

  if (profile.isPending) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Carregando perfil">
        <Skeleton className="h-6 w-48" />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      </div>
    )
  }
  if (profile.isError) {
    return <ErrorState message={profile.error.message} onRetry={() => void profile.refetch()} retrying={profile.isFetching} />
  }

  return (
    <div className="space-y-10">
      <ProfileSection user={profile.data} />
      <PasswordSection />
    </div>
  )
}

function ProfileSection({ user }: { user: User }) {
  const update = useUpdateProfile()
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    mode: 'onBlur',
    defaultValues: { displayName: user.displayName, username: user.username, email: user.email, bio: user.bio },
  })
  const { register, handleSubmit, formState, setError, reset } = form

  useEffect(() => {
    reset({ displayName: user.displayName, username: user.username, email: user.email, bio: user.bio })
  }, [user, reset])

  const onSubmit = handleSubmit((values) => {
    setFormError(null)
    update.mutate(values, {
      onSuccess: () => toast.success('Perfil atualizado.'),
      onError: (error) => {
        if (isApiError(error)) {
          for (const [field, message] of Object.entries(error.fields)) setError(field as keyof ProfileForm, { type: 'server', message })
        }
        setFormError(error.message)
      },
    })
  })

  return (
    <section aria-labelledby="profile-title">
      <h1 id="profile-title" className="text-sm font-bold">
        Perfil do colecionador
      </h1>
      <AvatarField user={user} />
      <form noValidate onSubmit={onSubmit} className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field id="profile-displayName" label="Nome de exibição" required error={formState.errors.displayName?.message}>
          {(a) => <Input {...a} autoComplete="name" {...register('displayName')} />}
        </Field>
        <Field id="profile-username" label="Nome de usuário" required error={formState.errors.username?.message}>
          {(a) => <Input {...a} autoComplete="username" {...register('username')} />}
        </Field>
        <Field id="profile-email" label="E-mail" required error={formState.errors.email?.message}>
          {(a) => <Input {...a} type="email" autoComplete="email" {...register('email')} />}
        </Field>
        <Field id="profile-bio" label="Bio" error={formState.errors.bio?.message} hint="Até 160 caracteres." className="sm:col-span-2">
          {(a) => <Textarea {...a} rows={3} {...register('bio')} />}
        </Field>
        {formError && (
          <p role="alert" className="text-xs text-danger sm:col-span-2" data-testid="profile-error">
            {formError}
          </p>
        )}
        <div className="sm:col-span-2">
          <Button type="submit" loading={update.isPending} disabled={!formState.isDirty && !update.isPending}>
            Salvar perfil
          </Button>
        </div>
      </form>
    </section>
  )
}

const MAX_AVATAR_BYTES = 1024 * 1024

function AvatarField({ user }: { user: User }) {
  const upload = useUploadAvatar()
  const remove = useRemoveAvatar()
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  function onFile(file: File | undefined) {
    setError(null)
    if (!file) return
    if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) {
      setError('Use uma imagem PNG, JPG, WEBP ou GIF.')
      return
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError('A imagem deve ter no máximo 1 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      upload.mutate(String(reader.result), {
        onSuccess: () => toast.success('Avatar atualizado.'),
        onError: (err) => setError(isApiError(err) ? (err.fields.avatar ?? err.message) : 'Falha ao enviar o avatar.'),
      })
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="mt-4 flex items-center gap-4">
      {user.avatarUrl ? (
        <img src={user.avatarUrl} alt={`Avatar de ${user.displayName}`} className="size-16 rounded-full object-cover" data-testid="avatar-image" />
      ) : (
        <span className="grid size-16 place-items-center rounded-full bg-primary text-xl font-bold text-primary-foreground" aria-hidden>
          {user.displayName.slice(0, 1).toUpperCase()}
        </span>
      )}
      <div className="space-y-1">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            id="avatar-input"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="sr-only"
            onChange={(e) => {
              onFile(e.target.files?.[0])
              e.target.value = ''
            }}
            aria-describedby={error ? 'avatar-error' : 'avatar-hint'}
          />
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} loading={upload.isPending}>
            <Upload aria-hidden />
            Alterar avatar
          </Button>
          {user.avatarUrl && (
            <Button type="button" variant="ghost" size="sm" onClick={() => remove.mutate()} loading={remove.isPending}>
              Remover
            </Button>
          )}
        </div>
        <label htmlFor="avatar-input" className="sr-only">
          Escolher imagem de avatar
        </label>
        {error ? (
          <p id="avatar-error" role="alert" className="text-xs text-danger">
            {error}
          </p>
        ) : (
          <p id="avatar-hint" className="text-[11px] text-subtle">
            PNG, JPG, WEBP ou GIF até 1 MB.
          </p>
        )}
      </div>
    </div>
  )
}

function PasswordSection() {
  const change = useChangePassword()
  const [formError, setFormError] = useState<string | null>(null)
  const { register, handleSubmit, formState, setError, reset } = useForm<PasswordChangeForm>({
    resolver: zodResolver(passwordChangeSchema),
    mode: 'onBlur',
  })

  const onSubmit = handleSubmit(({ currentPassword, newPassword }) => {
    setFormError(null)
    change.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          reset({ currentPassword: '', newPassword: '', confirmPassword: '' })
          toast.success('Senha alterada com sucesso.')
        },
        onError: (error) => {
          if (isApiError(error)) {
            for (const [field, message] of Object.entries(error.fields)) setError(field as keyof PasswordChangeForm, { type: 'server', message })
          }
          setFormError(error.message)
        },
      },
    )
  })

  return (
    <section aria-labelledby="password-title">
      <h2 id="password-title" className="text-sm font-bold">
        Alterar senha
      </h2>
      <form noValidate onSubmit={onSubmit} className="mt-4 grid max-w-md gap-4">
        <Field id="current-password" label="Senha atual" required error={formState.errors.currentPassword?.message}>
          {(a) => <PasswordInput {...a} toggleLabel="senha atual" autoComplete="current-password" {...register('currentPassword')} />}
        </Field>
        <Field id="new-password" label="Nova senha" required error={formState.errors.newPassword?.message} hint="Mínimo de 8 caracteres, com letras e números.">
          {(a) => <PasswordInput {...a} toggleLabel="nova senha" autoComplete="new-password" {...register('newPassword')} />}
        </Field>
        <Field id="confirm-password" label="Confirmar nova senha" required error={formState.errors.confirmPassword?.message}>
          {(a) => <PasswordInput {...a} toggleLabel="confirmação da nova senha" autoComplete="new-password" {...register('confirmPassword')} />}
        </Field>
        {formError && (
          <p role="alert" className="text-xs text-danger" data-testid="password-error">
            {formError}
          </p>
        )}
        <div>
          <Button type="submit" loading={change.isPending}>
            Salvar nova senha
          </Button>
        </div>
      </form>
    </section>
  )
}
