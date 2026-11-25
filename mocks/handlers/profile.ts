import { HttpResponse } from 'msw'
import type { AvatarInput, PasswordChangeInput, ProfileUpdateInput } from '@/api/contracts'
import { passwordChangeInputSchema, profileSchema, zodFieldErrors } from '@/api/schemas'
import { db } from '../db'
import { toUser } from '../domain'
import { ApiFail, hashPassword, readJson, requireUser, route } from '../http'

const MAX_AVATAR_CHARS = 1_500_000

export const profileHandlers = [
  route('get', '/profile', ({ request }) => {
    const { user } = requireUser(request)
    return HttpResponse.json(toUser(user))
  }),

  route('patch', '/profile', async ({ request }) => {
    const { user } = requireUser(request)
    const body = await readJson<ProfileUpdateInput>(request)
    const parsed = profileSchema.safeParse(body)
    if (!parsed.success) {
      throw new ApiFail(422, 'VALIDATION_ERROR', 'Revise os campos destacados.', zodFieldErrors(parsed.error))
    }
    const data = parsed.data
    const others = db.state.users.filter((u) => u.id !== user.id)
    if (others.some((u) => u.email.toLowerCase() === data.email.toLowerCase())) {
      throw new ApiFail(409, 'EMAIL_TAKEN', 'Este e-mail já está em uso.', { email: 'Este e-mail já está em uso por outra conta.' })
    }
    if (others.some((u) => u.username.toLowerCase() === data.username.toLowerCase())) {
      throw new ApiFail(409, 'USERNAME_TAKEN', 'Este nome de usuário já está em uso.', { username: 'Escolha outro nome de usuário.' })
    }
    user.displayName = data.displayName
    user.username = data.username
    user.email = data.email.toLowerCase()
    user.bio = data.bio
    db.save()
    return HttpResponse.json(toUser(user))
  }),

  route('put', '/profile/avatar', async ({ request }) => {
    const { user } = requireUser(request)
    const { dataUrl } = await readJson<AvatarInput>(request)
    if (typeof dataUrl !== 'string' || !/^data:image\/(png|jpeg|webp|gif);base64,/.test(dataUrl)) {
      throw new ApiFail(422, 'VALIDATION_ERROR', 'Formato de imagem não suportado.', { avatar: 'Use PNG, JPG, WEBP ou GIF.' })
    }
    if (dataUrl.length > MAX_AVATAR_CHARS) {
      throw new ApiFail(422, 'VALIDATION_ERROR', 'Imagem muito grande.', { avatar: 'A imagem deve ter no máximo 1 MB.' })
    }
    user.avatarUrl = dataUrl
    db.save()
    return HttpResponse.json(toUser(user))
  }),

  route('delete', '/profile/avatar', ({ request }) => {
    const { user } = requireUser(request)
    user.avatarUrl = null
    db.save()
    return HttpResponse.json(toUser(user))
  }),

  route('put', '/profile/password', async ({ request }) => {
    const { user } = requireUser(request)
    const body = await readJson<PasswordChangeInput>(request)
    const parsed = passwordChangeInputSchema.safeParse(body)
    if (!parsed.success) {
      throw new ApiFail(422, 'VALIDATION_ERROR', 'Revise os campos destacados.', zodFieldErrors(parsed.error))
    }
    const currentHash = await hashPassword(user.passwordSalt, parsed.data.currentPassword)
    if (currentHash !== user.passwordHash) {
      throw new ApiFail(422, 'WRONG_PASSWORD', 'A senha atual está incorreta.', { currentPassword: 'Senha atual incorreta.' })
    }
    const salt = crypto.randomUUID()
    user.passwordSalt = salt
    user.passwordHash = await hashPassword(salt, parsed.data.newPassword)
    db.save()
    return new HttpResponse(null, { status: 204 })
  }),
]
