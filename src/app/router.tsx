import { Navigate, Route, Routes } from 'react-router-dom'

import { AppLayout, RequireAuth, RequirePermission } from '@/components'
import { HealthPage } from '@/pages/HealthPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { PermissionsPage } from '@/pages/PermissionsPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { AlbumDetailPage } from '@/pages/albums/AlbumDetailPage'
import { AllAlbumsPage } from '@/pages/albums/AllAlbumsPage'
import { MyAlbumsPage } from '@/pages/albums/MyAlbumsPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { PhotoDetailPage } from '@/pages/photos/PhotoDetailPage'
import { RoleEditorPage } from '@/pages/roles/RoleEditorPage'
import { RolesPage } from '@/pages/roles/RolesPage'
import { UserDetailPage } from '@/pages/users/UserDetailPage'
import { UserRolesPage } from '@/pages/users/UserRolesPage'
import { UsersPage } from '@/pages/users/UsersPage'
import { PERMISSIONS } from '@/services'

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
