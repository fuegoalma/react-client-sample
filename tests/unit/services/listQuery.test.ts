import { describe, expect, it } from 'vitest'

import { ListQueryBuilder } from '@/services'

describe('ListQueryBuilder', () => {
  describe('sort serialisation', () => {
    it('prefixes descending attributes with a hyphen', () => {
      expect(
        ListQueryBuilder.formatSort([
          { attribute: 'created_at', direction: 'desc' },
          { attribute: 'title', direction: 'asc' },
        ]),
      ).toBe('-created_at,title')
    })

    it('parses the API’s own format back', () => {
      expect(ListQueryBuilder.parseSort('-created_at,title')).toEqual([
        { attribute: 'created_at', direction: 'desc' },
        { attribute: 'title', direction: 'asc' },
      ])
    })

    it('ignores blanks and stray separators', () => {
      expect(ListQueryBuilder.parseSort(' , title , ')).toEqual([
        { attribute: 'title', direction: 'asc' },
      ])
      expect(ListQueryBuilder.parseSort('')).toEqual([])
      expect(ListQueryBuilder.parseSort('-')).toEqual([])
    })
  })

  describe('toParams', () => {
    it('omits page 1, which is the API default', () => {
      expect(ListQueryBuilder.toParams({ page: 1 })).toEqual({})
      expect(ListQueryBuilder.toParams({ page: 3 })).toEqual({ page: '3' })
    })

    it('clamps per_page to the range the API accepts', () => {
      // Outside 1–100 the API answers 422, so never send it.
      expect(ListQueryBuilder.toParams({ perPage: 500 })).toEqual({ per_page: '100' })
      expect(ListQueryBuilder.toParams({ perPage: 0 })).toEqual({ per_page: '1' })
      expect(ListQueryBuilder.toParams({ perPage: 20 })).toEqual({ per_page: '20' })
    })

    it('drops untouched filters so an empty input never reaches the API', () => {
      expect(
        ListQueryBuilder.toParams({ filters: { title: '', user_id: undefined, email: 'jo' } }),
      ).toEqual({ email: 'jo' })
    })

    it('sends booleans the way the API compares them', () => {
      expect(ListQueryBuilder.toParams({ filters: { is_deleted: true } })).toEqual({
        is_deleted: '1',
      })
      expect(ListQueryBuilder.toParams({ filters: { is_deleted: false } })).toEqual({
        is_deleted: '0',
      })
    })

    it('joins a multi-attribute sort', () => {
      expect(
        ListQueryBuilder.toParams({
          sort: [
            { attribute: 'title', direction: 'desc' },
            { attribute: 'id', direction: 'asc' },
          ],
        }),
      ).toEqual({ sort: '-title,id' })
    })

    it('omits an empty sort list', () => {
      expect(ListQueryBuilder.toParams({ sort: [] })).toEqual({})
    })
  })

  describe('filterSortable', () => {
    const sortable = ['id', 'title', 'created_at']

    it('drops an attribute the API would 422', () => {
      expect(
        ListQueryBuilder.filterSortable(
          [{ attribute: 'password_hash', direction: 'asc' }],
          sortable,
        ),
      ).toEqual([])
    })

    it('keeps the known attributes of a mixed sort, in order', () => {
      expect(
        ListQueryBuilder.filterSortable(
          [
            { attribute: 'created_at', direction: 'desc' },
            { attribute: 'bogus', direction: 'asc' },
            { attribute: 'title', direction: 'asc' },
          ],
          sortable,
        ),
      ).toEqual([
        { attribute: 'created_at', direction: 'desc' },
        { attribute: 'title', direction: 'asc' },
      ])
    })

    it('keeps nothing when the resource declares nothing sortable', () => {
      expect(
        ListQueryBuilder.filterSortable([{ attribute: 'title', direction: 'asc' }], []),
      ).toEqual([])
    })
  })

  describe('toggleSort', () => {
    it('cycles ascending, descending, then unsorted', () => {
      const first = ListQueryBuilder.toggleSort([], 'title')
      expect(first).toEqual([{ attribute: 'title', direction: 'asc' }])

      const second = ListQueryBuilder.toggleSort(first, 'title')
      expect(second).toEqual([{ attribute: 'title', direction: 'desc' }])

      expect(ListQueryBuilder.toggleSort(second, 'title')).toEqual([])
    })

    it('replaces the sort when a different column is clicked', () => {
      expect(
        ListQueryBuilder.toggleSort([{ attribute: 'title', direction: 'desc' }], 'created_at'),
      ).toEqual([{ attribute: 'created_at', direction: 'asc' }])
    })
  })
})
