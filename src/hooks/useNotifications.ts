import { useCallback } from 'react'

import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { dismissed, notified, selectNotifications } from '@/app/notificationsSlice'
import { errorMessage } from '@/api'

/**
 * User feedback. `reportError` exists so every screen turns a failed request
 * into a toast the same way — including the API's 409 conflict messages, which
 * explain a safety invariant and must be shown verbatim.
 */
export function useNotifications() {
  const dispatch = useAppDispatch()
  const notifications = useAppSelector(selectNotifications)

  const reportSuccess = useCallback(
    (message: string) => dispatch(notified('success', message)),
    [dispatch],
  )

  const reportError = useCallback(
    (error: unknown, fallback?: string) =>
      dispatch(notified('danger', errorMessage(error, fallback))),
    [dispatch],
  )

  const dismiss = useCallback((id: string) => dispatch(dismissed(id)), [dispatch])

  return { notifications, reportSuccess, reportError, dismiss }
}
