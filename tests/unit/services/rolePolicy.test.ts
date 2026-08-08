import { describe, expect, it } from 'vitest'

import { RolePolicy } from '@/services'
import { checkerFor } from '@tests/utils/policies'

function policyFor(...permissions: string[]): RolePolicy {
  return new RolePolicy(checkerFor(...permissions))
}

const SYSTEM_ROLE = { is_system: true }
const CUSTOM_ROLE = { is_system: false }

/**
 * The rule worth a service: a system role may be re-composed but never renamed
 * or deleted. Offering either would produce a 422/409 the user cannot act on.
 */
describe('RolePolicy', () => {
  describe('system roles', () => {
    it('may be re-composed by a role manager', () => {
      expect(policyFor('role.manage').canRecompose()).toBe(true)
    })

    it('may not be renamed, even by a role manager', () => {
      expect(policyFor('role.manage').canRename(SYSTEM_ROLE)).toBe(false)
    })

    it('may not be deleted, even by a role manager', () => {
      expect(policyFor('role.manage').canDelete(SYSTEM_ROLE)).toBe(false)
    })
  })

  describe('custom roles', () => {
    it('may be renamed and deleted by a role manager', () => {
      expect(policyFor('role.manage').canRename(CUSTOM_ROLE)).toBe(true)
      expect(policyFor('role.manage').canDelete(CUSTOM_ROLE)).toBe(true)
    })

    it('may not be touched without role.manage', () => {
      expect(policyFor('role.index', 'role.view').canRename(CUSTOM_ROLE)).toBe(false)
      expect(policyFor('role.index', 'role.view').canDelete(CUSTOM_ROLE)).toBe(false)
      expect(policyFor('role.index', 'role.view').canCreate()).toBe(false)
    })
  })

  describe('the read side, which an admin has without role.manage', () => {
    it('gates the list behind role.index', () => {
      expect(policyFor().canList()).toBe(false)
      expect(policyFor('role.index').canList()).toBe(true)
    })

    it('gates the composition screen behind role.view', () => {
      expect(policyFor('role.index').canView()).toBe(false)
      expect(policyFor('role.view').canView()).toBe(true)
    })

    it('gates assignment behind role.assign, separately from role.manage', () => {
      expect(policyFor('role.manage').canAssign()).toBe(false)
      expect(policyFor('role.assign').canAssign()).toBe(true)
    })
  })
})
