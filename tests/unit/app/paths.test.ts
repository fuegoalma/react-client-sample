import { describe, expect, it } from 'vitest'

import { paths, ROUTES } from '@/app/paths'

describe('paths', () => {
  it('addresses a member by substituting the route pattern', () => {
    expect(paths.album(10)).toBe('/albums/10')
    expect(paths.user(3)).toBe('/users/3')
    expect(paths.userRoles(3)).toBe('/users/3/roles')
    expect(paths.role(7)).toBe('/roles/7')
  })

  it('substitutes both parameters of a nested member', () => {
    expect(paths.photo(10, 42)).toBe('/albums/10/photos/42')
  })

  it('leaves no placeholder behind in any built address', () => {
    const built = [
      paths.album(1),
      paths.photo(1, 2),
      paths.user(1),
      paths.userRoles(1),
      paths.role(1),
    ]

    for (const address of built) {
      expect(address).not.toContain(':')
    }
  })

  /*
   * The builders are derived from the patterns rather than written out beside
   * them, so a route renamed in one place cannot keep answering under its old
   * address in the other — which is the whole reason this module exists.
   */
  it('builds every member address from its own route pattern', () => {
    expect(ROUTES.album).toBe('/albums/:albumId')
    expect(ROUTES.photo).toBe('/albums/:albumId/photos/:photoId')
    expect(ROUTES.user).toBe('/users/:userId')
    expect(ROUTES.userRoles).toBe('/users/:userId/roles')
    expect(ROUTES.role).toBe('/roles/:roleId')
  })

  it('exposes the collection and standalone screens as plain addresses', () => {
    expect(paths.myAlbums).toBe('/albums')
    expect(paths.allAlbums).toBe('/all-albums')
    expect(paths.users).toBe('/users')
    expect(paths.roles).toBe('/roles')
    expect(paths.newRole).toBe('/roles/new')
    expect(paths.permissions).toBe('/permissions')
    expect(paths.profile).toBe('/profile')
    expect(paths.health).toBe('/health')
  })

  it('exposes the public auth screens', () => {
    expect(paths.login).toBe('/login')
    expect(paths.register).toBe('/register')
    expect(paths.forgotPassword).toBe('/forgot-password')
    expect(paths.resetPassword).toBe('/reset-password')
    expect(paths.verifyEmail).toBe('/verify-email')
  })
})
