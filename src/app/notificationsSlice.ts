import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit'

export type NotificationVariant = 'success' | 'danger' | 'warning' | 'info'

export interface Notification {
  readonly id: string
  readonly variant: NotificationVariant
  readonly message: string
}

export interface NotificationsState {
  readonly items: Notification[]
}

const initialState: NotificationsState = { items: [] }

/**
 * Transient user feedback (toasts). Kept in the store rather than in a context
 * so any layer — including the transport's re-auth failure path — can raise one.
 */
export const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    notified: {
      reducer(state, action: PayloadAction<Notification>) {
        state.items.push(action.payload)
      },
      prepare(variant: NotificationVariant, message: string) {
        return { payload: { id: nanoid(), variant, message } }
      },
    },
    dismissed(state, action: PayloadAction<string>) {
      state.items = state.items.filter((item) => item.id !== action.payload)
    },
  },
  selectors: {
    selectNotifications: (state) => state.items,
  },
})

export const { notified, dismissed } = notificationsSlice.actions
export const { selectNotifications } = notificationsSlice.selectors

export const notifySuccess = (message: string) => notified('success', message)
export const notifyError = (message: string) => notified('danger', message)
