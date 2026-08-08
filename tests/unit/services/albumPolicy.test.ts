import { describe, expect, it } from 'vitest'

import { AlbumPolicy } from '@/services'
import { checkerFor } from '@tests/utils/policies'

function policyFor(...permissions: string[]): AlbumPolicy {
  return new AlbumPolicy(checkerFor(...permissions))
}

/**
 * `DELETE /albums/{id}` is one route with two outcomes. Getting this wrong
 * means telling a moderator an album is gone when it was only flagged.
 */
describe('AlbumPolicy', () => {
  describe('deleteMode', () => {
    it('is permanent for the owner, with no role at all', () => {
      expect(policyFor().deleteMode(true)).toBe('permanent')
    })

    it('is nothing for a base user on someone else’s album', () => {
      expect(policyFor().deleteMode(false)).toBeNull()
    })

    it('is soft for a moderator on someone else’s album', () => {
      expect(policyFor('album.soft-delete.any').deleteMode(false)).toBe('soft')
    })

    it('is permanent for an admin on someone else’s album', () => {
      expect(policyFor('album.delete.any').deleteMode(false)).toBe('permanent')
    })

    it('prefers permanent when a role carries both', () => {
      expect(policyFor('album.delete.any', 'album.soft-delete.any').deleteMode(false)).toBe(
        'permanent',
      )
    })

    it('stays permanent on your own album even while holding soft-delete', () => {
      expect(policyFor('album.soft-delete.any').deleteMode(true)).toBe('permanent')
    })
  })

  describe('showsDeletionState', () => {
    it('is hidden from a moderator, who can never see a flagged album again', () => {
      expect(policyFor('album.index.any', 'album.soft-delete.any').showsDeletionState()).toBe(false)
    })

    it('is shown to whoever can restore', () => {
      expect(policyFor('album.restore').showsDeletionState()).toBe(true)
    })

    it('is shown to whoever can delete any album outright', () => {
      expect(policyFor('album.delete.any').showsDeletionState()).toBe(true)
    })
  })

  describe('the rest of the surface', () => {
    it('lets every authenticated user create an album', () => {
      expect(policyFor().canCreate()).toBe(true)
    })

    it('opens the all-albums screen only to album.index.any', () => {
      expect(policyFor().canListAll()).toBe(false)
      expect(policyFor('album.index.any').canListAll()).toBe(true)
    })

    it('allows viewing and updating your own album without a role', () => {
      expect(policyFor().canView(true)).toBe(true)
      expect(policyFor().canUpdate(true)).toBe(true)
      expect(policyFor().canView(false)).toBe(false)
      expect(policyFor().canUpdate(false)).toBe(false)
    })

    it('gates restore behind album.restore', () => {
      expect(policyFor().canRestore()).toBe(false)
      expect(policyFor('album.restore').canRestore()).toBe(true)
    })
  })
})

describe('where an album screen points back to', () => {
  it('sends an owner to their own list', () => {
    expect(policyFor().albumsCrumb(true)).toEqual({ label: 'My albums', to: '/albums' })
  })

  it('sends someone who can list every album to the all-albums screen', () => {
    expect(policyFor('album.index.any').albumsCrumb(false)).toEqual({
      label: 'All albums',
      to: '/all-albums',
    })
  })

  it('offers no link at all to a caller who may view but not list', () => {
    // A crumb that answers 403 is worse than a crumb that does nothing.
    expect(policyFor('album.view.any').albumsCrumb(false)).toEqual({ label: 'Albums' })
  })

  it('prefers the owner’s own list even when the caller could list them all', () => {
    expect(policyFor('album.index.any').albumsCrumb(true)).toEqual({
      label: 'My albums',
      to: '/albums',
    })
  })
})
