import { screen, within } from '@testing-library/react'
import { http } from 'msw'
import { describe, expect, it } from 'vitest'

import { HealthBadge } from '@/components'
import { HealthPage } from '@/pages/HealthPage'

import { db } from '../mocks/db'
import { fail, ok } from '../mocks/envelope'
import { server } from '../mocks/server'
import { renderWithProviders } from '../utils/renderWithProviders'

describe('Health page', () => {
  it('reports a healthy API and each of its checks', async () => {
    renderWithProviders(<HealthPage />)

    const table = await screen.findByRole('table')
    expect(within(table).getByText('database')).toBeInTheDocument()
    expect(within(table).getByText('ok')).toBeInTheDocument()
  })

  it('renders the failing check rather than a generic error on a 503', async () => {
    // A 503 is a *result* here: the API answers it with a body naming the
    // check that failed, so the page must show that, not "request failed".
    db.health = 'error'
    renderWithProviders(<HealthPage />)

    const table = await screen.findByRole('table')
    expect(within(table).getByText('database')).toBeInTheDocument()
    expect(within(table).getAllByText('error').length).toBeGreaterThan(0)
  })

  it('is reachable without being signed in', async () => {
    renderWithProviders(<HealthPage />, { authenticated: false })

    expect(await screen.findByRole('table')).toBeInTheDocument()
  })

  it('re-reads the probe on demand', async () => {
    const { user } = renderWithProviders(<HealthPage />)
    await screen.findByRole('table')

    db.health = 'error'
    await user.click(screen.getByRole('button', { name: 'Refresh' }))

    expect(await screen.findAllByText('error')).not.toHaveLength(0)
  })

  it('reports a failure that is not the API answering unhealthily', async () => {
    // A 500 is not a health *result* — there is no body naming a check, so the
    // page has nothing to render but the error.
    server.use(http.get('http://localhost:8084/health', () => fail(500)))
    renderWithProviders(<HealthPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent(/unexpected problem/i)
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('refuses to render a body it does not recognise as a health report', async () => {
    server.use(http.get('http://localhost:8084/health', () => ok({ nothing: 'useful' })))
    renderWithProviders(<HealthPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent(/unrecognised health response/i)
  })
})

describe('Health badge', () => {
  it('shows the API as healthy', async () => {
    renderWithProviders(<HealthBadge />)

    expect(await screen.findByText('API healthy')).toBeInTheDocument()
  })

  it('shows the API as unavailable when a check fails', async () => {
    db.health = 'error'
    renderWithProviders(<HealthBadge />)

    expect(await screen.findByText('API unavailable')).toBeInTheDocument()
  })
})

describe('A health response the client cannot read', () => {
  it('refuses a null body', () => {
    server.use(http.get('http://localhost:8084/health', () => ok(null)))
    renderWithProviders(<HealthPage />)

    return expect(screen.findByRole('alert')).resolves.toHaveTextContent(
      /unrecognised health response/i,
    )
  })
})
