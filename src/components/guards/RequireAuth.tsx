import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { selectIsAuthenticated } from '@/app/authSlice'
import { useAppSelector } from '@/app/hooks'

/**
 * Gates every authenticated route. The intended location is remembered so the
 * login screen can return the user to where they were headed.
 */
export function RequireAuth() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}
