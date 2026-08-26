/**
 * Every address this client knows, in one place.
 *
 * The route table declares a pattern (`/albums/:albumId`) and every link needs
 * the filled-in address (`/albums/10`), so the two forms genuinely differ — but
 * they are not two facts. `paths` is built *from* `ROUTES`, so a route that
 * moves cannot keep answering under its old address from a link that was never
 * updated.
 *
 * It is the same lesson `AlbumPolicy.albumsCrumb()` was written for: the album
 * screen and the photo screen beneath it each spelled "/albums" out for
 * themselves and stopped agreeing, and the photo screen ended up offering a
 * crumb that answered 403.
 */
export const ROUTES = {
  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  verifyEmail: '/verify-email',

  myAlbums: '/albums',
  album: '/albums/:albumId',
  photo: '/albums/:albumId/photos/:photoId',
  allAlbums: '/all-albums',

  users: '/users',
  user: '/users/:userId',
  userRoles: '/users/:userId/roles',

  roles: '/roles',
  newRole: '/roles/new',
  role: '/roles/:roleId',

  permissions: '/permissions',
  profile: '/profile',
  health: '/health',
} as const

/**
 * Addresses to navigate to. A screen with parameters gets a builder; everything
 * else is the pattern itself, which has nothing to substitute.
 */
export const paths = {
  login: ROUTES.login,
  register: ROUTES.register,
  forgotPassword: ROUTES.forgotPassword,
  resetPassword: ROUTES.resetPassword,
  verifyEmail: ROUTES.verifyEmail,

  myAlbums: ROUTES.myAlbums,
  album: (albumId: number): string => ROUTES.album.replace(':albumId', String(albumId)),
  photo: (albumId: number, photoId: number): string =>
    ROUTES.photo.replace(':albumId', String(albumId)).replace(':photoId', String(photoId)),
  allAlbums: ROUTES.allAlbums,

  users: ROUTES.users,
  user: (userId: number): string => ROUTES.user.replace(':userId', String(userId)),
  userRoles: (userId: number): string => ROUTES.userRoles.replace(':userId', String(userId)),

  roles: ROUTES.roles,
  newRole: ROUTES.newRole,
  role: (roleId: number): string => ROUTES.role.replace(':roleId', String(roleId)),

  permissions: ROUTES.permissions,
  profile: ROUTES.profile,
  health: ROUTES.health,
} as const
