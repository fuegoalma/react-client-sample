import { describe, expect, it } from 'vitest'

import { UserPolicy } from '@/services'
import { checkerFor } from '@tests/utils/policies'

const SELF = 7
const OTHER = 8

function policyFor(...permissions: string[]): UserPolicy {
  return new UserPolicy(checkerFor(...permissions), SELF)
}

/**
 * The asymmetry this pins down is the API's own: `user.update` is granted by
 * ownership, `user.view` and `user.delete` are not — not even on your own
 * account. Getting it wrong would offer a moderator screen to a base user and
 * turn every click into a 403.
 */
describe('UserPolicy', () => {
  describe('ownership', () => {
    it('recognises the caller', () => {
      expect(policyFor().isSelf(SELF)).toBe(true)
      expect(policyFor().isSelf(OTHER)).toBe(false)
    })

    it('owns nobody while the profile is still loading', () => {
      const anonymous = new UserPolicy(checkerFor(), null)
      expect(anonymous.isSelf(SELF)).toBe(false)
      expect(anonymous.canUpdate(SELF)).toBe(false)
    })
  })

  describe('update — the one ability ownership grants', () => {
    it('lets a base user edit their own account', () => {
      expect(policyFor().canUpdate(SELF)).toBe(true)
    })

    it('refuses someone else’s without a role', () => {
      expect(policyFor().canUpdate(OTHER)).toBe(false)
    })

    it('grants any account with user.update.any', () => {
      expect(policyFor('user.update.any').canUpdate(OTHER)).toBe(true)
    })
  })

  describe('view and delete — role-only, even on your own account', () => {
    it('refuses viewing your own account without user.view.any', () => {
      expect(policyFor().canView(SELF)).toBe(false)
    })

    it('refuses deleting your own account without user.delete.any', () => {
      expect(policyFor().canDelete(SELF)).toBe(false)
    })

    it('grants both with the .any variants', () => {
      expect(policyFor('user.view.any').canView(SELF)).toBe(true)
      expect(policyFor('user.view.any').canView(OTHER)).toBe(true)
      expect(policyFor('user.delete.any').canDelete(OTHER)).toBe(true)
    })
  })

  describe('the collection-level permissions', () => {
    it('gates the list behind user.index.any', () => {
      expect(policyFor().canListAll()).toBe(false)
      expect(policyFor('user.index.any').canListAll()).toBe(true)
    })

    it('gates creation behind user.create', () => {
      expect(policyFor().canCreate()).toBe(false)
      expect(policyFor('user.create').canCreate()).toBe(true)
    })

    it('gates role assignment behind role.assign', () => {
      expect(policyFor().canAssignRoles()).toBe(false)
      expect(policyFor('role.assign').canAssignRoles()).toBe(true)
    })
  })
})
