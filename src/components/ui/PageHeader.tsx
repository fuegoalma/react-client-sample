import type { ReactNode } from 'react'

import { useDocumentTitle } from '@/hooks'

import { Breadcrumbs, type Crumb } from './Breadcrumbs'

interface PageHeaderProps {
  readonly title: string
  readonly subtitle?: ReactNode
  readonly actions?: ReactNode
  /**
   * The trail to this screen. Nested pages pass one; a top-level screen leaves
   * it out, where a single crumb would only repeat the heading below it.
   */
  readonly breadcrumbs?: readonly Crumb[]
}

export function PageHeader({ title, subtitle, actions, breadcrumbs }: PageHeaderProps) {
  useDocumentTitle(title)

  return (
    <>
      {breadcrumbs !== undefined && <Breadcrumbs items={breadcrumbs} />}

      <header className="pageHeader">
        <div>
          <h1 className="pageHeader__title">{title}</h1>
          {subtitle !== undefined && <p className="pageHeader__subtitle">{subtitle}</p>}
        </div>
        {actions !== undefined && <div className="d-flex gap-2">{actions}</div>}
      </header>
    </>
  )
}
