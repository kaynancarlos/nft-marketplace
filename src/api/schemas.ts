import { z } from 'zod'

/**
 * Schemas de validação compartilhados entre formulários (react-hook-form) e
 * handlers MSW. A API simulada valida com as mesmas regras e devolve
 * `fields` no corpo do erro 422, que os formulários associam aos campos.
 */

const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/
const SOLANA_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

export const emailField = z.string().trim().min(1, 'Informe o e-mail.').email('Informe um e-mail válido.')

export const strongPassword = z
  .string()
  .min(8, 'A senha precisa ter pelo menos 8 caracteres.')
  .regex(/[A-Za-z]/, 'Inclua pelo menos uma letra.')
  .regex(/\d/, 'Inclua pelo menos um número.')

export const usernameField = z
  .string()
  .trim()
  .min(3, 'Use pelo menos 3 caracteres.')
  .max(24, 'Use no máximo 24 caracteres.')
  .regex(/^[a-zA-Z0-9_.]+$/, 'Use apenas letras, números, ponto ou _.')

export const displayNameField = z
  .string()
  .trim()
  .min(2, 'Use pelo menos 2 caracteres.')
  .max(40, 'Use no máximo 40 caracteres.')

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Informe a senha.'),
})
export type LoginForm = z.infer<typeof loginSchema>

export const registerInputSchema = z.object({
  username: usernameField,
  email: emailField,
  password: strongPassword,
})

export const registerSchema = registerInputSchema
  .extend({ confirmPassword: z.string().min(1, 'Confirme a senha.') })
  .refine((d) => d.password === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não coincidem.',
  })
export type RegisterForm = z.infer<typeof registerSchema>

export const profileSchema = z.object({
  displayName: displayNameField,
  username: usernameField,
  email: emailField,
  bio: z.string().trim().max(160, 'Use no máximo 160 caracteres.'),
})
export type ProfileForm = z.infer<typeof profileSchema>

export const passwordChangeInputSchema = z.object({
  currentPassword: z.string().min(1, 'Informe a senha atual.'),
  newPassword: strongPassword,
})

export const passwordChangeSchema = passwordChangeInputSchema
  .extend({ confirmPassword: z.string().min(1, 'Confirme a nova senha.') })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não coincidem.',
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    path: ['newPassword'],
    message: 'A nova senha deve ser diferente da atual.',
  })
export type PasswordChangeForm = z.infer<typeof passwordChangeSchema>

export const networkField = z.enum(['ethereum', 'polygon', 'solana'], {
  errorMap: () => ({ message: 'Selecione uma rede.' }),
})

export const walletTypeField = z.enum(['metamask', 'walletconnect', 'coinbase'], {
  errorMap: () => ({ message: 'Selecione o tipo de carteira.' }),
})

export const walletSchema = z
  .object({
    label: z.string().trim().min(2, 'Dê um nome para a carteira.').max(30, 'Use no máximo 30 caracteres.'),
    network: networkField,
    type: walletTypeField,
    address: z.string().trim().min(1, 'Informe o endereço da carteira.'),
    ens: z
      .string()
      .trim()
      .max(40, 'Use no máximo 40 caracteres.')
      .regex(/^[a-z0-9.-]*$/, 'Use letras minúsculas, números, ponto ou hífen (sem ".eth").')
      .optional()
      .or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    const valid = data.network === 'solana' ? SOLANA_ADDRESS.test(data.address) : EVM_ADDRESS.test(data.address)
    if (!valid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['address'],
        message:
          data.network === 'solana'
            ? 'Endereço Solana inválido (base58, 32 a 44 caracteres).'
            : 'Endereço inválido. Use o formato 0x seguido de 40 caracteres hexadecimais.',
      })
    }
  })
export type WalletForm = z.infer<typeof walletSchema>

export const collectorSchema = z.object({
  displayName: displayNameField,
  username: usernameField,
  email: emailField,
  referralCode: z
    .string()
    .trim()
    .max(20, 'Use no máximo 20 caracteres.')
    .regex(/^[A-Za-z0-9-]*$/, 'Código de indicação inválido.')
    .optional()
    .or(z.literal('')),
  note: z.string().trim().max(280, 'Use no máximo 280 caracteres.').optional().or(z.literal('')),
})
export type CollectorForm = z.infer<typeof collectorSchema>

/** Converte um ZodError em `{ campo: mensagem }` (primeira mensagem por campo). */
export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_'
    if (!out[key]) out[key] = issue.message
  }
  return out
}
