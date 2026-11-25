import { HttpResponse } from 'msw'
import type { LoginInput, RegisterInput, Session } from '@/api/contracts'
import { loginSchema, registerInputSchema, zodFieldErrors } from '@/api/schemas'
import { db } from '../db'
import { toUser } from '../domain'
import type { UserRecord } from '../fixtures'
import { ApiFail, bearerToken, hashPassword, readJson, requireUser, route } from '../http'
import { sessionTtl } from '../scenarios'

function createSession(user: UserRecord): Session {
  const token = `tok_${crypto.randomUUID().replace(/-/g, '')}`
  const expiresAt = Date.now() + sessionTtl()
  db.state.sessions[token] = { userId: user.id, expiresAt }
  db.save()
  return { token, expiresAt: new Date(expiresAt).toISOString(), user: toUser(user) }
}

export const authHandlers = [
  route('post', '/auth/register', async ({ request }) => {
    const body = await readJson<RegisterInput>(request)
    const parsed = registerInputSchema.safeParse(body)
    if (!parsed.success) {
      throw new ApiFail(422, 'VALIDATION_ERROR', 'Revise os campos destacados.', zodFieldErrors(parsed.error))
    }
    const { username, email, password } = parsed.data
    const lowerEmail = email.toLowerCase()
    if (db.state.users.some((u) => u.email.toLowerCase() === lowerEmail)) {
      throw new ApiFail(409, 'EMAIL_TAKEN', 'Já existe uma conta com este e-mail.', { email: 'Este e-mail já está cadastrado.' })
    }
    if (db.state.users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
      throw new ApiFail(409, 'USERNAME_TAKEN', 'Este nome de usuário já está em uso.', { username: 'Escolha outro nome de usuário.' })
    }
    const salt = crypto.randomUUID()
    const user: UserRecord = {
      id: db.nextId('usr'),
      displayName: username,
      username,
      email: lowerEmail,
      bio: '',
      avatarUrl: null,
      passwordSalt: salt,
      passwordHash: await hashPassword(salt, password),
      createdAt: new Date().toISOString(),
    }
    db.state.users.push(user)
    db.state.favorites[user.id] = []
    db.state.wallets[user.id] = { primary: null, secondary: null }
    db.save()
    return HttpResponse.json(createSession(user), { status: 201 })
  }),

  route('post', '/auth/login', async ({ request }) => {
    const body = await readJson<LoginInput>(request)
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) {
      throw new ApiFail(422, 'VALIDATION_ERROR', 'Revise os campos destacados.', zodFieldErrors(parsed.error))
    }
    const user = db.state.users.find((u) => u.email.toLowerCase() === parsed.data.email.toLowerCase())
    const hash = user ? await hashPassword(user.passwordSalt, parsed.data.password) : null
    if (!user || hash !== user.passwordHash) {
      throw new ApiFail(401, 'INVALID_CREDENTIALS', 'E-mail ou senha incorretos.')
    }
    return HttpResponse.json(createSession(user))
  }),

  route('get', '/auth/session', ({ request }) => {
    const { user, token } = requireUser(request)
    const session = db.state.sessions[token]
    const body: Session = { token, expiresAt: new Date(session.expiresAt).toISOString(), user: toUser(user) }
    return HttpResponse.json(body)
  }),

  route('post', '/auth/logout', ({ request }) => {
    const token = bearerToken(request)
    if (token && db.state.sessions[token]) {
      const userId = db.state.sessions[token].userId
      delete db.state.sessions[token]
      for (const ws of Object.values(db.state.walletSessions)) {
        if (ws.userId === userId) ws.status = 'disconnected'
      }
      db.save()
    }
    return new HttpResponse(null, { status: 204 })
  }),
]
