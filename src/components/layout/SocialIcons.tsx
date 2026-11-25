export type SocialNetwork = 'facebook' | 'instagram' | 'twitter' | 'linkedin' | 'youtube'

/** Ícones de marca desenhados à mão (o Lucide descontinuou ícones de marcas). */
export function SocialIcon({ network }: { network: SocialNetwork }) {
  const common = { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'currentColor', 'aria-hidden': true }
  switch (network) {
    case 'facebook':
      return (
        <svg {...common}>
          <path d="M14 8V6.5c0-.8.4-1.5 1.6-1.5H17V2h-2.6C11.6 2 11 4 11 5.9V8H9v3h2v11h3V11h2.6l.4-3z" />
        </svg>
      )
    case 'instagram':
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
        </svg>
      )
    case 'twitter':
      return (
        <svg {...common}>
          <path d="M22 5.9c-.7.3-1.5.6-2.4.7.9-.5 1.5-1.3 1.8-2.3-.8.5-1.7.8-2.6 1-1.6-1.7-4.4-1.6-6 .2-1 1.1-1.4 2.6-1 4-3.4-.2-6.5-1.8-8.6-4.4-1.1 1.9-.6 4.4 1.3 5.6-.7 0-1.3-.2-1.9-.5 0 2 1.4 3.8 3.4 4.2-.6.2-1.3.2-1.9.1.6 1.7 2.1 2.9 3.9 2.9-1.7 1.4-3.9 2-6 1.8 1.9 1.2 4.1 1.9 6.4 1.9 7.7 0 12-6.5 11.8-12.3.8-.6 1.5-1.3 2-2.1z" />
        </svg>
      )
    case 'linkedin':
      return (
        <svg {...common}>
          <path d="M4.98 3.5A2.5 2.5 0 1 1 5 8.5a2.5 2.5 0 0 1-.02-5zM3 9.5h4V21H3zM9.5 9.5h3.8v1.6h.1c.5-1 1.8-2 3.8-2 4 0 4.8 2.6 4.8 6V21h-4v-5.2c0-1.2 0-2.8-1.7-2.8s-2 1.3-2 2.7V21h-4z" />
        </svg>
      )
    case 'youtube':
      return (
        <svg {...common}>
          <path d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12a31 31 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.8 31 31 0 0 0-.5-4.8zM9.8 15.1V8.9L15.5 12z" />
        </svg>
      )
  }
}
