import { useMemo } from 'react'

import { useAppSelector } from '@/app/hooks'
import { selectIsAuthenticated } from '@/app/authSlice'
import { useMeQuery, useMyPermissionsQuery } from '@/repositories'
import { AlbumPolicy, PermissionService, PhotoPolicy, RolePolicy, UserPolicy } from '@/services'

export interface Access {
  readonly permissions: PermissionService
  /** One policy per resource that has rules, mirroring the API's services. */
  readonly albums: AlbumPolicy
  readonly photos: PhotoPolicy
  readonly users: UserPolicy
  readonly roles: RolePolicy
  /** Album ownership, derived from the caller's own profile. */
  readonly ownsAlbum: (albumId: number) => boolean
  readonly currentUserId: number | null
  readonly isLoading: boolean
}

/**
 * Everything the UI needs to decide what to render.
 *
 * `/users/me/permissions` is the API's answer to exactly this question, and
 * `/users/me` carries the caller's albums — which is how ownership is resolved
 * client-side, since album list responses carry no owner. Both are cached by
 * RTK Query, so this costs two requests per session, not per component.
 */
export function usePermissions(): Access {
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const skip = !isAuthenticated

  const { data: mine, isLoading: loadingPermissions } = useMyPermissionsQuery(undefined, { skip })
  const { data: me, isLoading: loadingMe } = useMeQuery(undefined, { skip })

  return useMemo<Access>(() => {
    const permissions = new PermissionService(mine?.roles ?? [], mine?.permissions ?? [])
    const ownedAlbumIds = new Set((me?.albums ?? []).map((album) => album.id))
    const currentUserId = me?.id ?? null

    return {
      permissions,
      albums: new AlbumPolicy(permissions),
      photos: new PhotoPolicy(permissions),
      users: new UserPolicy(permissions, currentUserId),
      roles: new RolePolicy(permissions),
      ownsAlbum: (albumId: number) => ownedAlbumIds.has(albumId),
      currentUserId,
      isLoading: !skip && (loadingPermissions || loadingMe),
    }
  }, [mine, me, skip, loadingPermissions, loadingMe])
}
