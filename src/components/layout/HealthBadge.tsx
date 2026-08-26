import { Link } from 'react-router-dom'

import { paths } from '@/app/paths'
import { useHealthQuery } from '@/repositories'

const POLL_INTERVAL_MS = 30_000

/**
 * The API's liveness, always visible. Polled rather than fetched once, so a
 * backend that goes away mid-session is noticed before the next action fails.
 */
export function HealthBadge() {
  const { data, isError, isLoading } = useHealthQuery(undefined, {
    pollingInterval: POLL_INTERVAL_MS,
  })

  const state = isLoading ? 'unknown' : isError || data?.status !== 'ok' ? 'error' : 'ok'
  const label = { ok: 'API healthy', error: 'API unavailable', unknown: 'Checking API…' }[state]

  return (
    <Link to={paths.health} className={`healthBadge healthBadge--${state} text-decoration-none`}>
      <span className="healthBadge__dot" aria-hidden="true" />
      <span>{label}</span>
    </Link>
  )
}
