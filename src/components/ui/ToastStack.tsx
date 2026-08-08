import { useEffect } from 'react'

import { useNotifications } from '@/hooks'
import type { Notification } from '@/app/notificationsSlice'

const AUTO_DISMISS_MS = 6000

/**
 * One toast, owning its own lifetime.
 *
 * The timer belongs to the individual toast rather than to the stack: a shared
 * effect would restart every timer each time another notification arrived, so a
 * busy screen would leave the earliest toasts on the page indefinitely.
 */
function Toast({
  notification,
  onDismiss,
}: {
  readonly notification: Notification
  readonly onDismiss: (id: string) => void
}) {
  const { id, variant, message } = notification

  useEffect(() => {
    // Errors stay until dismissed — a 409 explains which safety rule refused
    // the operation, and that is worth reading twice.
    if (variant === 'danger') return undefined

    const timer = setTimeout(() => {
      onDismiss(id)
    }, AUTO_DISMISS_MS)

    return () => {
      clearTimeout(timer)
    }
  }, [id, variant, onDismiss])

  return (
    <div
      className={`toastStack__item alert alert-${variant} d-flex align-items-start gap-2 mb-0 shadow-sm`}
      role={variant === 'danger' ? 'alert' : 'status'}
    >
      <span className="flex-grow-1">{message}</span>
      <button
        type="button"
        className="btn-close"
        aria-label="Dismiss"
        onClick={() => {
          onDismiss(id)
        }}
      />
    </div>
  )
}

/** Transient feedback, stacked out of the way of the page's own controls. */
export function ToastStack() {
  const { notifications, dismiss } = useNotifications()

  if (notifications.length === 0) return null

  return (
    <div className="toastStack" aria-live="polite" aria-atomic="true">
      {notifications.map((notification) => (
        <Toast key={notification.id} notification={notification} onDismiss={dismiss} />
      ))}
    </div>
  )
}
