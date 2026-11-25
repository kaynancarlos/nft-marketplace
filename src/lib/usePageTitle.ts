import { useEffect } from 'react'

/** Título por página (SEO e contexto para leitores de tela). */
export function usePageTitle(title: string | null | undefined) {
  useEffect(() => {
    if (!title) return
    document.title = `${title} | Kurio`
  }, [title])
}
