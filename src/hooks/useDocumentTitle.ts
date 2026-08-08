import { useEffect } from 'react'

import { config } from '@/config'

/**
 * Names the current screen in the browser's tab and history.
 *
 * A client-side navigation changes everything on the page except its title, so
 * without this every entry in the back menu and every bookmark reads the same
 * — and a screen reader announces nothing on arrival.
 *
 * It lives in a hook rather than in `PageHeader` because three components own
 * an `<h1>`: that header, the auth card, and the not-found screen. One of them
 * holding the format would leave the other two stale.
 */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    document.title = `${title} · ${config.appName}`
  }, [title])
}
