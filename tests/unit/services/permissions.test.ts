import { describe, expect, it } from 'vitest'

import { BASE_USER_PERMISSIONS, OWN_ABILITIES, PermissionService } from '@/services'

/**
 * The client's mirror of the API's `AccessControlService`. If these rules drift
 * from the server's, the UI starts offering actions that answer 403.
 */
describe('PermissionService', () => {
  const baseUser = BASE_USER_PERMISSIONS
  const moderator = new PermissionService(
    ['moderator'],
    ['album.index.any', 'album.update.any', 'album.soft-delete.any', 'photo.delete.any'],
  )

  describe('can', () => {
    it('grants a permission the caller holds', () => {
      expect(moderator.can('album.update.any')).toBe(true)
    })

    it('denies a permission the caller does not hold', () => {
      expect(moderator.can('album.delete.any')).toBe(false)
    })

    it('denies everything to a caller with no roles', () => {
      expect(baseUser.can('album.index.any')).toBe(false)
    })
  })

  describe('canOn', () => {
    it('grants an implicit ability on your own record without any role', () => {
      expect(baseUser.canOn('album.update', true)).toBe(true)
      expect(baseUser.canOn('photo.delete', true)).toBe(true)
      expect(baseUser.canOn('user.update', true)).toBe(true)
    })

    it('denies the same ability on someone else’s record', () => {
      expect(baseUser.canOn('album.update', false)).toBe(false)
    })

    it('grants it on any record when a role carries the .any variant', () => {
      expect(moderator.canOn('album.update', false)).toBe(true)
    })

    it('never grants viewing or deleting a user by ownership', () => {
      // Deliberate on the server too: these are role-only, even on yourself.
      expect(baseUser.canOn('user.view', true)).toBe(false)
      expect(baseUser.canOn('user.delete', true)).toBe(false)
    })

    it('never grants a listing by ownership', () => {
      expect(baseUser.canOn('album.index', true)).toBe(false)
      expect(baseUser.canOn('user.index', true)).toBe(false)
    })

    it('checks only its own permission, so an unrelated grant does not leak', () => {
      // A custom role of just `photo.delete.any` may delete any photo without
      // being able to view one.
      const deleter = new PermissionService([], ['photo.delete.any'])
      expect(deleter.canOn('photo.delete', false)).toBe(true)
      expect(deleter.canOn('photo.view', false)).toBe(false)
    })
  })

  it('carries the roles it was built from, for anything that renders them', () => {
    expect(moderator.roles).toEqual(['moderator'])
    expect(baseUser.roles).toEqual([])
  })

  it('lists exactly the abilities ownership grants', () => {
    expect([...OWN_ABILITIES].sort()).toEqual([
      'album.delete',
      'album.update',
      'album.view',
      'photo.create',
      'photo.delete',
      'photo.update',
      'photo.view',
      'user.update',
    ])
  })
})
