import { useState } from 'react'

import type { FilterDefinition } from '@/types'

interface FilterBarProps {
  readonly filters: readonly FilterDefinition[]
  readonly values: Readonly<Record<string, string>>
  readonly onApply: (values: Record<string, string>) => void
  readonly onReset: () => void
  readonly isFiltered: boolean
}

/**
 * The filter form shared by every list screen. Filters are applied on submit
 * rather than on each keystroke — the API paginates server-side, so filtering
 * as you type would mean a request per character.
 */
export function FilterBar({ filters, values, onApply, onReset, isFiltered }: FilterBarProps) {
  const [draft, setDraft] = useState<Record<string, string>>({ ...values })
  const [applied, setApplied] = useState(values)

  // The URL is the source of truth; adopt it whenever it changes (the back
  // button, a reset elsewhere on the page). Adjusting during render rather
  // than in an effect avoids a second pass with the stale draft on screen.
  if (applied !== values) {
    setApplied(values)
    setDraft({ ...values })
  }

  return (
    <form
      className="filterBar"
      role="search"
      onSubmit={(event) => {
        event.preventDefault()
        onApply(draft)
      }}
    >
      {filters.map((filter) => {
        const id = `filter-${filter.key}`
        const value = draft[filter.key] ?? ''

        return (
          <div className="filterBar__field" key={filter.key}>
            <label className="form-label small mb-1" htmlFor={id}>
              {filter.label}
            </label>

            {filter.type === 'select' ? (
              <select
                id={id}
                className="form-select form-select-sm"
                value={value}
                onChange={(event) => {
                  setDraft((current) => ({ ...current, [filter.key]: event.target.value }))
                }}
              >
                {filter.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={id}
                type={filter.type ?? 'text'}
                className="form-control form-control-sm"
                placeholder={filter.placeholder}
                value={value}
                onChange={(event) => {
                  setDraft((current) => ({ ...current, [filter.key]: event.target.value }))
                }}
              />
            )}
          </div>
        )
      })}

      <div className="d-flex gap-2">
        <button type="submit" className="btn btn-sm btn-primary">
          Apply
        </button>
        {isFiltered && (
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onReset}>
            Reset
          </button>
        )}
      </div>
    </form>
  )
}
