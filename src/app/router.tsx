import { lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import { AppLayout, RequireAuth, RequirePermission } from '@/components'
import { HealthPage } from '@/pages/HealthPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { AlbumDetailPage } from '@/pages/albums/AlbumDetailPage'
import { MyAlbumsPage } from '@/pages/albums/MyAlbumsPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { PhotoDetailPage } from '@/pages/photos/PhotoDetailPage'
import { PERMISSIONS } from '@/services'

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
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/albums" replace />} />

          <Route path="/albums" element={<MyAlbumsPage />} />
          <Route path="/albums/:albumId" element={<AlbumDetailPage />} />
          <Route path="/albums/:albumId/photos/:photoId" element={<PhotoDetailPage />} />

          <Route element={<RequirePermission anyOf={[PERMISSIONS.albumIndexAny]} />}>
            <Route path="/all-albums" element={<AllAlbumsPage />} />
          </Route>

          <Route element={<RequirePermission anyOf={[PERMISSIONS.userIndexAny]} />}>
            <Route path="/users" element={<UsersPage />} />
          </Route>

          <Route element={<RequirePermission anyOf={[PERMISSIONS.userViewAny]} />}>
            <Route path="/users/:userId" element={<UserDetailPage />} />
          </Route>

          <Route element={<RequirePermission anyOf={[PERMISSIONS.roleAssign]} />}>
            <Route path="/users/:userId/roles" element={<UserRolesPage />} />
          </Route>

          <Route element={<RequirePermission anyOf={[PERMISSIONS.roleIndex]} />}>
            <Route path="/roles" element={<RolesPage />} />
          </Route>

          <Route element={<RequirePermission anyOf={[PERMISSIONS.roleManage]} />}>
            <Route path="/roles/new" element={<RoleEditorPage />} />
          </Route>

          <Route element={<RequirePermission anyOf={[PERMISSIONS.roleView]} />}>
            <Route path="/roles/:roleId" element={<RoleEditorPage />} />
          </Route>

          <Route element={<RequirePermission anyOf={[PERMISSIONS.permissionIndex]} />}>
            <Route path="/permissions" element={<PermissionsPage />} />
          </Route>

          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/health" element={<HealthPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  )
}
