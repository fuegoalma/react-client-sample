import { Link } from 'react-router-dom'

import { useDocumentTitle } from '@/hooks'

export function NotFoundPage() {
  useDocumentTitle('Page not found')

  return (
    <div className="emptyState">
      <h1 className="h4">Page not found</h1>
      <p>The address you followed does not match any screen in this client.</p>
      <Link className="btn btn-sm btn-primary" to="/albums">
        Back to my albums
      </Link>
    </div>
  )
}
