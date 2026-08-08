import type { ReactNode } from 'react'

import { config } from '@/config'
import { useDocumentTitle } from '@/hooks'

interface AuthLayoutProps {
  readonly title: string
  readonly lead: string
  readonly children: ReactNode
  readonly footer?: ReactNode
}

/** The centred card the public auth screens live in. */
export function AuthLayout({ title, lead, children, footer }: AuthLayoutProps) {
  useDocumentTitle(title)

  return (
    <div className="authLayout">
      <div className="authLayout__card">
        <p className="text-primary fw-semibold mb-3">
          <i className="bi bi-images me-2" aria-hidden="true" />
          {config.appName}
        </p>

        <h1 className="authLayout__title">{title}</h1>
        <p className="authLayout__lead">{lead}</p>

        {children}

        {footer !== undefined && <div className="mt-4 text-center small">{footer}</div>}
      </div>
    </div>
  )
}
