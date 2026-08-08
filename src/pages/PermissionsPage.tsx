import { useMemo, useState } from 'react'

import { PageHeader, QueryBoundary, SearchField } from '@/components'
import { usePermissionsQuery } from '@/repositories'

/**
 * The read-only permission catalog (`permission.index`, super admin).
 *
 * Permissions are code-checked strings, so their lifecycle belongs to the API's
 * migrations — there is deliberately no way to create or edit one here. Names
 * are grouped by their resource prefix, which is how they read.
 */
export function PermissionsPage() {
  const { data = [], error, isLoading } = usePermissionsQuery()
  const [search, setSearch] = useState('')

  const groups = useMemo(() => {
    const needle = search.trim().toLowerCase()
    const matching = data.filter(
      (permission) =>
        needle === '' ||
        permission.name.toLowerCase().includes(needle) ||
        permission.description.toLowerCase().includes(needle),
    )

    const byResource = new Map<string, typeof matching>()
    for (const permission of matching) {
      // Every permission is `<resource>.<action>`, so the prefix is the text
      // before the first dot — which is the whole name when there is none.
      const dot = permission.name.indexOf('.')
      const resource = dot === -1 ? permission.name : permission.name.slice(0, dot)
      byResource.set(resource, [...(byResource.get(resource) ?? []), permission])
    }

    return [...byResource.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [data, search])

  return (
    <>
      <PageHeader
        title="Permissions"
        subtitle="The catalog roles are composed from. Managed by the API's migrations — read-only here."
      />

      <SearchField
        id="permission-search"
        label="Search"
        placeholder="Name or description"
        value={search}
        onChange={setSearch}
      />

      <QueryBoundary
        isLoading={isLoading}
        error={error}
        isEmpty={groups.length === 0}
        emptyMessage="No permissions match this search."
      >
        <div className="row g-3">
          {groups.map(([resource, permissions]) => (
            <div className="col-md-6" key={resource}>
              <section className="appCard p-3 h-100">
                <h2 className="h6 text-capitalize">{resource}</h2>
                <ul className="list-unstyled mb-0 small">
                  {permissions.map((permission) => (
                    <li key={permission.name} className="py-1 border-bottom">
                      <code>{permission.name}</code>
                      <span className="d-block text-secondary">{permission.description}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          ))}
        </div>
      </QueryBoundary>
    </>
  )
}
