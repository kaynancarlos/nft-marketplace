import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { PasswordChangeInput, ProfileUpdateInput, User, WalletInput, WalletSlot, WalletsResponse } from '@/api/contracts'
import { profileApi, walletApi } from '@/api/endpoints'
import { authStore, useAuth } from '@/auth/authStore'
import { qk } from './keys'

function useUserId() {
  const { user } = useAuth()
  return user?.id ?? null
}

export function useProfile() {
  const userId = useUserId()
  return useQuery({
    queryKey: qk.private.profile(userId ?? 'anon'),
    queryFn: ({ signal }) => profileApi.get({ signal }),
    enabled: Boolean(userId),
  })
}

function useApplyUser() {
  const queryClient = useQueryClient()
  return (user: User) => {
    queryClient.setQueryData(qk.private.profile(user.id), user)
    authStore.updateUser(user)
  }
}

export function useUpdateProfile() {
  const apply = useApplyUser()
  return useMutation({
    mutationFn: (input: ProfileUpdateInput) => profileApi.update(input),
    onSuccess: apply,
  })
}

export function useUploadAvatar() {
  const apply = useApplyUser()
  return useMutation({
    mutationFn: (dataUrl: string) => profileApi.uploadAvatar(dataUrl),
    onSuccess: apply,
  })
}

export function useRemoveAvatar() {
  const apply = useApplyUser()
  return useMutation({
    mutationFn: () => profileApi.removeAvatar(),
    onSuccess: apply,
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (input: PasswordChangeInput) => profileApi.changePassword(input),
  })
}

export function useWallets() {
  const userId = useUserId()
  return useQuery({
    queryKey: qk.private.wallets(userId ?? 'anon'),
    queryFn: ({ signal }) => walletApi.list({ signal }),
    enabled: Boolean(userId),
  })
}

export function useSaveWallet() {
  const queryClient = useQueryClient()
  const userId = useUserId()
  return useMutation({
    mutationFn: ({ slot, input }: { slot: WalletSlot; input: WalletInput }) => walletApi.save(slot, input),
    onSuccess: (wallet) => {
      if (!userId) return
      queryClient.setQueryData<WalletsResponse>(qk.private.wallets(userId), (old) => ({
        primary: old?.primary ?? null,
        secondary: old?.secondary ?? null,
        [wallet.slot]: wallet,
      }))
      queryClient.invalidateQueries({ queryKey: qk.private.wallets(userId) })
    },
  })
}
