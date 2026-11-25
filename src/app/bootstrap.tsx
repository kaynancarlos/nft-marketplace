import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { createQueryClient } from './queryClient'
import { createAppRouter } from './router'

export function mount(element: HTMLElement) {
  const queryClient = createQueryClient()
  const router = createAppRouter(queryClient)
  createRoot(element).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  )
}
