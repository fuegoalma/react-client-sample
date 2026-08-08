import { describe, expect, it } from 'vitest'

import { PhotoPolicy } from '@/services'
import { checkerFor } from '@tests/utils/policies'

function policyFor(...permissions: string[]): PhotoPolicy {
  return new PhotoPolicy(checkerFor(...permissions))
}

/**
 * `isOwn` is the parent album's ownership. Every branch matters: the API checks
 * each action against its own permission, so a role of one `.any` grants that
 * action and nothing else.
 */
describe('PhotoPolicy', () => {
  describe('a base user, with no role at all', () => {
    it('may do everything inside their own album', () => {
      const policy = policyFor()
      expect(policy.canView(true)).toBe(true)
      expect(policy.canUpload(true)).toBe(true)
      expect(policy.canUpdate(true)).toBe(true)
      expect(policy.canDelete(true)).toBe(true)
    })

    it('may do nothing in someone else’s', () => {
      const policy = policyFor()
      expect(policy.canView(false)).toBe(false)
      expect(policy.canUpload(false)).toBe(false)
      expect(policy.canUpdate(false)).toBe(false)
      expect(policy.canDelete(false)).toBe(false)
    })
  })

  describe('the .any upgrades', () => {
    it('grants viewing another album’s photos with photo.view.any', () => {
      expect(policyFor('photo.view.any').canView(false)).toBe(true)
    })

    it('grants uploading with photo.create.any', () => {
      expect(policyFor('photo.create.any').canUpload(false)).toBe(true)
    })

    it('grants editing with photo.update.any', () => {
      expect(policyFor('photo.update.any').canUpdate(false)).toBe(true)
    })

    it('grants deleting with photo.delete.any', () => {
      expect(policyFor('photo.delete.any').canDelete(false)).toBe(true)
    })
  })

  it('keeps each action on its own permission — delete.any does not grant view', () => {
    const policy = policyFor('photo.delete.any')
    expect(policy.canDelete(false)).toBe(true)
    expect(policy.canView(false)).toBe(false)
    expect(policy.canUpdate(false)).toBe(false)
    expect(policy.canUpload(false)).toBe(false)
  })
})
