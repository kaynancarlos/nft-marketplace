import { HttpResponse } from 'msw'
import type { FavoritesResponse } from '@/api/contracts'
import { db, findNft } from '../db'
import { ApiFail, requireUser, route } from '../http'

function body(userId: string): FavoritesResponse {
  return { nftIds: [...(db.state.favorites[userId] ?? [])] }
}

export const favoriteHandlers = [
  route('get', '/favorites', ({ request }) => {
    const { user } = requireUser(request)
    return HttpResponse.json(body(user.id))
  }),

  route('put', '/favorites/:nftId', ({ request, params }) => {
    const { user } = requireUser(request)
    if (!findNft(params.nftId)) throw new ApiFail(404, 'NOT_FOUND', 'NFT não encontrado.')
    const list = (db.state.favorites[user.id] ??= [])
    if (!list.includes(params.nftId)) list.push(params.nftId)
    db.save()
    return HttpResponse.json(body(user.id))
  }),

  route('delete', '/favorites/:nftId', ({ request, params }) => {
    const { user } = requireUser(request)
    db.state.favorites[user.id] = (db.state.favorites[user.id] ?? []).filter((id) => id !== params.nftId)
    db.save()
    return HttpResponse.json(body(user.id))
  }),
]
