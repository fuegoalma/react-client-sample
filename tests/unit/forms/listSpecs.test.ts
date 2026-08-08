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
 * These specs mirror the API's `*SearchForm` whitelists, transcribed from
 * `config/openapi.yaml`. An attribute that drifts out of sync fails silently in
 * the UI — a sortable column that 422s, or a filter the server ignores — so it
 * is asserted here rather than discovered on screen.
 */
describe('list specs', () => {
  const cases: readonly (readonly [string, ListSpec, readonly string[], readonly string[]])[] = [
    [
      'users',
      userListSpec,
      ['first_name', 'last_name', 'email'],
      ['id', 'first_name', 'last_name', 'email', 'created_at', 'updated_at'],
    ],
    ['albums', albumListSpec, ['title'], ['id', 'user_id', 'title', 'created_at', 'updated_at']],
    ['photos', photoListSpec, ['title'], ['id', 'title', 'created_at']],
    ['roles', roleListSpec, ['name'], ['id', 'name']],
  ]

  it.each(cases)('declares %s exactly as the API does', (_name, spec, filters, sortable) => {
    expect(spec.filters.map((filter) => filter.key)).toEqual(filters)
    expect(spec.sortable).toEqual(sortable)
  })

  it.each(cases)('sorts %s by an attribute the API accepts', (_name, spec) => {
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
