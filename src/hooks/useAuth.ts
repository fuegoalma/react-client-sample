import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  credentialsReceived,
  loggedOut,
  selectIsAuthenticated,
  selectRefreshToken,
} from '@/app/authSlice'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { notifySuccess } from '@/app/notificationsSlice'
import { toStoredTokens } from '@/contracts'
import {
  useLoginMutation,
  useLogoutAllMutation,
  useLogoutMutation,
  useRegisterMutation,
} from '@/repositories'
import type { LoginRequest, RegisterRequest } from '@/types'

/**
 * The session, as the UI sees it.
 *
 * Signing out is best-effort by design: the API's logout is idempotent and the
 * local session must end even if the request fails, so the token is always
 * dropped locally regardless of the response.
 */
export function useAuth() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const refreshToken = useAppSelector(selectRefreshToken)

  const [loginRequest, loginState] = useLoginMutation()
  const [registerRequest, registerState] = useRegisterMutation()
  const [logoutRequest] = useLogoutMutation()
  const [logoutAllRequest] = useLogoutAllMutation()

  const login = useCallback(
    async (body: LoginRequest): Promise<void> => {
      const pair = await loginRequest(body).unwrap()
      dispatch(credentialsReceived(toStoredTokens(pair)))
    },
    [loginRequest, dispatch],
  )

  const register = useCallback(
    async (body: RegisterRequest): Promise<void> => {
      const pair = await registerRequest(body).unwrap()
      dispatch(credentialsReceived(toStoredTokens(pair)))
    },
    [registerRequest, dispatch],
  )

  const endSession = useCallback(
    async (everywhere: boolean): Promise<void> => {
      if (refreshToken !== null) {
        const request = everywhere ? logoutAllRequest : logoutRequest
        try {
          await request({ refresh_token: refreshToken }).unwrap()
        } catch {
          // The server-side session may already be gone; ours ends either way.
        }
      }
      dispatch(loggedOut())
      dispatch(
        notifySuccess(everywhere ? 'Signed out on all devices.' : 'You have been signed out.'),
      )
    },
    [refreshToken, logoutRequest, logoutAllRequest, dispatch],
  )

  /**
   * Ends the session and leaves for the login screen.
   *
   * The navigation is part of signing out, not an extra a screen may forget:
   * `loggedOut` resets the RTK Query cache, so a screen left mounted would
   * re-issue its queries with no token behind it.
   */
  const signOut = useCallback(
    async (everywhere = false): Promise<void> => {
      await endSession(everywhere)
      void navigate('/login', { replace: true })
    },
    [endSession, navigate],
  )

  return {
    isAuthenticated,
    login,
    register,
    signOut,
    isLoggingIn: loginState.isLoading,
    isRegistering: registerState.isLoading,
  }
}
