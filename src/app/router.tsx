import { lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import { AppLayout, RequireAuth, RequirePermission } from '@/components'
import { HealthPage } from '@/pages/HealthPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { AlbumDetailPage } from '@/pages/albums/AlbumDetailPage'
import { MyAlbumsPage } from '@/pages/albums/MyAlbumsPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'
import { VerifyEmailPage } from '@/pages/auth/VerifyEmailPage'
import { PhotoDetailPage } from '@/pages/photos/PhotoDetailPage'
import { PERMISSIONS } from '@/services'

import { paths, ROUTES } from './paths'

/*
 * The privileged screens are split out of the initial bundle.
 *
 * Every one of them sits behind a `RequirePermission` gate, so a base user —
 * the common case — can never reach them, and downloading them on sign-in is
 * paying for a screen that will not be shown. They are fetched when their route
 * is first entered instead.
 *
 * The screens above stay static: they are what the caller lands on, and
 * deferring those would only trade a smaller bundle for a slower first paint.
 */
const AllAlbumsPage = lazy(async () => ({
  default: (await import('@/pages/albums/AllAlbumsPage')).AllAlbumsPage,
}))
const UsersPage = lazy(async () => ({
  default: (await import('@/pages/users/UsersPage')).UsersPage,
}))
const UserDetailPage = lazy(async () => ({
  default: (await import('@/pages/users/UserDetailPage')).UserDetailPage,
}))
const UserRolesPage = lazy(async () => ({
  default: (await import('@/pages/users/UserRolesPage')).UserRolesPage,
}))
const RolesPage = lazy(async () => ({
  default: (await import('@/pages/roles/RolesPage')).RolesPage,
}))
const RoleEditorPage = lazy(async () => ({
  default: (await import('@/pages/roles/RoleEditorPage')).RoleEditorPage,
}))
const PermissionsPage = lazy(async () => ({
  default: (await import('@/pages/PermissionsPage')).PermissionsPage,
}))

/**
 * The route table.
 *
 * Permission-gated routes are grouped under `RequirePermission` so the gate is
 * declared once per audience rather than repeated in each screen. It hides UI
 * only — the API re-checks every request.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route path={ROUTES.login} element={<LoginPage />} />
      <Route path={ROUTES.register} element={<RegisterPage />} />

      {/*
       * Public, like the endpoints behind them: a locked-out user has no
       * session to authenticate with, and a confirmation link has to open in
       * whichever browser the message was read in.
       */}
      <Route path={ROUTES.forgotPassword} element={<ForgotPasswordPage />} />
      <Route path={ROUTES.resetPassword} element={<ResetPasswordPage />} />
      <Route path={ROUTES.verifyEmail} element={<VerifyEmailPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to={paths.myAlbums} replace />} />

          <Route path={ROUTES.myAlbums} element={<MyAlbumsPage />} />
          <Route path={ROUTES.album} element={<AlbumDetailPage />} />
          <Route path={ROUTES.photo} element={<PhotoDetailPage />} />

          <Route element={<RequirePermission anyOf={[PERMISSIONS.albumIndexAny]} />}>
            <Route path={ROUTES.allAlbums} element={<AllAlbumsPage />} />
          </Route>

          <Route element={<RequirePermission anyOf={[PERMISSIONS.userIndexAny]} />}>
            <Route path={ROUTES.users} element={<UsersPage />} />
          </Route>

          <Route element={<RequirePermission anyOf={[PERMISSIONS.userViewAny]} />}>
            <Route path={ROUTES.user} element={<UserDetailPage />} />
          </Route>

          <Route element={<RequirePermission anyOf={[PERMISSIONS.roleAssign]} />}>
            <Route path={ROUTES.userRoles} element={<UserRolesPage />} />
          </Route>

          <Route element={<RequirePermission anyOf={[PERMISSIONS.roleIndex]} />}>
            <Route path={ROUTES.roles} element={<RolesPage />} />
          </Route>

          <Route element={<RequirePermission anyOf={[PERMISSIONS.roleManage]} />}>
            <Route path={ROUTES.newRole} element={<RoleEditorPage />} />
          </Route>

          <Route element={<RequirePermission anyOf={[PERMISSIONS.roleView]} />}>
            <Route path={ROUTES.role} element={<RoleEditorPage />} />
          </Route>

          <Route element={<RequirePermission anyOf={[PERMISSIONS.permissionIndex]} />}>
            <Route path={ROUTES.permissions} element={<PermissionsPage />} />
          </Route>

          <Route path={ROUTES.profile} element={<ProfilePage />} />
          <Route path={ROUTES.health} element={<HealthPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  )
}
