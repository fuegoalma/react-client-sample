import { configureStore, createListenerMiddleware } from '@reduxjs/toolkit'

import type { TokenStorage } from '@/contracts'
import { baseApi } from '@/repositories'
import { createTokenStorage } from '@/services'

import { authSlice, credentialsReceived, initialAuthState, loggedOut } from './authSlice'
import { notificationsSlice } from './notificationsSlice'

export interface StoreOptions {
  /**
   * Where the token pair is persisted. Injected here — the composition root —
   * so nothing below the store knows about `localStorage`, and tests can pass
   * an in-memory implementation.
   */
  readonly tokenStorage?: TokenStorage
}

/**
 * Keeps persisted tokens in step with the store, and makes signing out actually
 * forget everything: cached server state belonged to the previous session.
 */
function createPersistenceMiddleware(storage: TokenStorage) {
  const listener = createListenerMiddleware()

  listener.startListening({
    actionCreator: credentialsReceived,
    effect: (action) => {
      storage.write(action.payload)
    },
  })

  listener.startListening({
    actionCreator: loggedOut,
    effect: (_action, api) => {
      storage.clear()
      api.dispatch(baseApi.util.resetApiState())
    },
  })

  return listener.middleware
}

export function createAppStore({ tokenStorage = createTokenStorage() }: StoreOptions = {}) {
  return configureStore({
    reducer: {
      [authSlice.reducerPath]: authSlice.reducer,
      [notificationsSlice.reducerPath]: notificationsSlice.reducer,
      [baseApi.reducerPath]: baseApi.reducer,
    },
    // Restores the session on a page reload before the first render.
    preloadedState: { auth: initialAuthState(tokenStorage.read()) },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware()
        .prepend(createPersistenceMiddleware(tokenStorage))
        .concat(baseApi.middleware),
  })
}

export const store = createAppStore()

export type AppStore = ReturnType<typeof createAppStore>
export type RootState = ReturnType<AppStore['getState']>
export type AppDispatch = AppStore['dispatch']
