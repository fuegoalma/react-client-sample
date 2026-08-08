import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { ListSpec } from '@/forms'
import { useListQuery } from '@/hooks'

import { renderWithProviders } from '../../utils/renderWithProviders'

/** Renders the resolved query, so a test can read what the URL produced. */
function Probe({ spec }: { readonly spec: ListSpec }) {
  const list = useListQuery(spec)

  return (
    <div>
      <output data-testid="query">{JSON.stringify(list.query)}</output>
      <button
        type="button"
        onClick={() => {
          // Deliberately partial: a caller may hand back fewer keys than the
          // spec declares, and the untouched ones must simply clear.
          list.applyFilters({ title: 'holiday' })
        }}
      >
        Apply partial
      </button>
    </div>
  )
}

function resolved(): unknown {
  return JSON.parse(screen.getByTestId('query').textContent)
}

const fullSpec: ListSpec = {
  filters: [
    { key: 'title', label: 'Title' },
    { key: 'owner', label: 'Owner' },
  ],
  sortable: ['id', 'title'],
  defaultSort: [{ attribute: 'id', direction: 'asc' }],
}

describe('useListQuery', () => {
  it('starts on the first page under the spec’s default order', () => {
    renderWithProviders(<Probe spec={fullSpec} />)

    expect(resolved()).toMatchObject({
      page: 1,
      sort: [{ attribute: 'id', direction: 'asc' }],
    })
  })

  it('treats a page number that is not a number as the first page', () => {
    // The URL is user-editable, so `?page=abc` has to mean something sane.
    renderWithProviders(<Probe spec={fullSpec} />, { route: '/?page=abc' })

    expect(resolved()).toMatchObject({ page: 1 })
  })

  it('refuses a page below the first', () => {
    renderWithProviders(<Probe spec={fullSpec} />, { route: '/?page=-3' })

    expect(resolved()).toMatchObject({ page: 1 })
  })

  it('clears the filters a caller left out of a partial apply', async () => {
    const { user } = renderWithProviders(<Probe spec={fullSpec} />, {
      route: '/?title=old&owner=ada',
    })

    await user.click(screen.getByRole('button', { name: 'Apply partial' }))

    expect(resolved()).toMatchObject({ filters: { title: 'holiday', owner: '' } })
  })

  it('copes with a resource that sorts by nothing', () => {
    // `sortable` is the API's whitelist; an empty one means the endpoint takes
    // no sort at all, and a hand-typed one must simply be dropped.
    const spec: ListSpec = { filters: [{ key: 'title', label: 'Title' }], sortable: [] }
    renderWithProviders(<Probe spec={spec} />, { route: '/?sort=title' })

    expect(resolved()).toMatchObject({ sort: [] })
  })

  it('copes with a resource that filters by nothing', () => {
    const spec: ListSpec = { filters: [], sortable: ['id'] }
    renderWithProviders(<Probe spec={spec} />)

    expect(resolved()).toMatchObject({ filters: {} })
  })
})
