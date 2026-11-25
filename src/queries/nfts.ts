import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query'
import type { NftListParams } from '@/api/contracts'
import { isApiError } from '@/api/client'
import { nftApi } from '@/api/endpoints'
import { qk } from './keys'

export const PAGE_SIZE = 9

export function nftListQuery(params: NftListParams) {
  return queryOptions({
    queryKey: qk.nfts.list(params),
    // O AbortSignal do Query é repassado ao Axios: trocar de filtro cancela a
    // requisição anterior. Como cada combinação de parâmetros tem sua própria
    // chave, uma resposta atrasada nunca sobrescreve a consulta atual.
    queryFn: ({ signal }) => nftApi.list(params, { signal }),
    placeholderData: keepPreviousData,
  })
}

export function useNftList(params: NftListParams) {
  return useQuery(nftListQuery(params))
}

export function nftDetailQuery(id: string) {
  return queryOptions({
    queryKey: qk.nfts.detail(id),
    queryFn: ({ signal }) => nftApi.detail(id, { signal }),
    retry: (count, error) => isApiError(error) && error.retryable && count < 2,
  })
}

export function useNftDetail(id: string) {
  return useQuery(nftDetailQuery(id))
}
