import { describe, expect, it } from 'vitest'

import {
  ALBUM_DELETION_FILTER,
  albumListSpec,
  photoListSpec,
  roleListSpec,
  userListSpec,
  withFilter,
  type ListSpec,
} from '@/forms'

/**
 * What is asserted here is each spec's *internal* consistency — the part that
 * would still be wrong even if the API agreed with it.
 *
 * Whether the filters and the sortable whitelist match the API is a different
 * question, and it is answered in `tests/contract/listSpecs.test.ts` by reading
 * the OpenAPI document itself. This file used to answer it too, from a
 * transcribed copy of those lists; the copy could drift from the document and
 * go on passing, so it has been removed rather than kept as a second opinion.
 */
describe('list specs', () => {
  const cases: readonly (readonly [string, ListSpec])[] = [
    ['users', userListSpec],
    ['albums', albumListSpec],
    ['photos', photoListSpec],
    ['roles', roleListSpec],
  ]

  it.each(cases)('sorts %s by an attribute it declares as sortable', (_name, spec) => {
    // A default order outside the whitelist is dropped by `useListQuery` and the
    // screen silently falls back — so the spec would be lying about its default.
    for (const entry of spec.defaultSort ?? []) {
      expect(spec.sortable).toContain(entry.attribute)
    }
  })

  describe('withFilter', () => {
    it('appends the deletion-state filter for the review audience', () => {
      const composed = withFilter(albumListSpec, ALBUM_DELETION_FILTER)

      expect(composed.filters.map((filter) => filter.key)).toEqual(['title', 'is_deleted'])
      expect(composed.sortable).toEqual(albumListSpec.sortable)
    })

    it('leaves the base spec untouched, so the two audiences cannot bleed', () => {
      withFilter(albumListSpec, ALBUM_DELETION_FILTER)

      expect(albumListSpec.filters.map((filter) => filter.key)).toEqual(['title'])
    })
  })
})
