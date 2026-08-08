import { PageHeader, QueryBoundary } from '@/components'
import { config } from '@/config'
import { useHealthQuery } from '@/repositories'
import type { HealthStatus } from '@/types'

function StatusPill({ status }: { readonly status: HealthStatus }) {
  const variant = status === 'ok' ? 'success' : 'danger'
  return <span className={`badge text-bg-${variant} text-uppercase`}>{status}</span>
}

/**
 * The public liveness probe, rendered in full. A 503 is a legitimate answer
 * here — the repository maps it to a result rather than an error so this page
 * can show *which* check failed.
 */
export function HealthPage() {
  const { data, error, isLoading, refetch, isFetching } = useHealthQuery()

  return (
    <>
      <PageHeader
        title="API status"
        subtitle={config.apiBaseUrl}
        actions={
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => void refetch()}
            disabled={isFetching}
          >
            Refresh
          </button>
        }
      />

      <QueryBoundary isLoading={isLoading} error={error}>
        {data !== undefined && (
          <div className="appCard p-3">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h2 className="h6 mb-0">Overall</h2>
              <StatusPill status={data.status} />
            </div>

            <table className="table mb-0">
              <thead>
                <tr>
                  <th scope="col">Check</th>
                  <th scope="col" className="text-end">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(data.checks).map(([name, status]) => (
                  <tr key={name}>
                    <td className="text-capitalize">{name}</td>
                    <td className="text-end">
                      <StatusPill status={status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </QueryBoundary>
    </>
  )
}
