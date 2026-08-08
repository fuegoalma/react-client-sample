import { screen, waitFor } from '@testing-library/react'
import { http } from 'msw'
import { describe, expect, it } from 'vitest'

import { MyAlbumsPage } from '@/pages/albums/MyAlbumsPage'
import { UsersPage } from '@/pages/users/UsersPage'

import { grantRole } from '../mocks/db'
import { server } from '../mocks/server'
import { renderWithProviders } from '../utils/renderWithProviders'

const API = 'http://localhost:8084'

/** Counts the member-endpoint calls a screen makes without being navigated to. */
function countRequests(path: string): () => number {
  let calls = 0
  server.events.on('request:start', ({ request }) => {
    if (new URL(request.url).pathname === path) calls += 1
  })
  return () => calls
}

/**
 * A list row links to a detail screen, so the record is fetched twice over: once
 * when the pointer arrives, once when the screen mounts. The first is the point
 * — by the time the click lands the answer is already in the cache.
 */
describe('Warming a row’s detail view', () => {
  it('fetches the album as the pointer reaches its row', async () => {
    const calls = countRequests('/albums/10')
    const { user } = renderWithProviders(<MyAlbumsPage />)

    const link = await screen.findByRole('link', { name: 'Vacation 2025' })
    expect(calls()).toBe(0)

    await user.hover(link)

    await waitFor(() => {
      expect(calls()).toBe(1)
    })
  })

  it('fetches the account as the pointer reaches its row', async () => {
    grantRole('admin')
    const calls = countRequests('/users/2')
    const { user } = renderWithProviders(<UsersPage />)

    const link = await screen.findByRole('link', { name: 'Grace Hopper' })
    await user.hover(link)

    await waitFor(() => {
      expect(calls()).toBe(1)
    })
  })

  it('is only a head start — a refused prefetch never reaches the user', async () => {
    // Scoped to the one album: `/albums/:id` would also match `/albums/my`,
    // and the list itself would be the thing that failed.
    server.use(http.get(`${API}/albums/10`, () => new Response(null, { status: 403 })))
    const { user } = renderWithProviders(<MyAlbumsPage />)

    await user.hover(await screen.findByRole('link', { name: 'Vacation 2025' }))

    // The list is untouched and nothing is announced: the screen that needs the
    // album is the one that gets to report a failure.
    expect(screen.getByRole('link', { name: 'Vacation 2025' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
