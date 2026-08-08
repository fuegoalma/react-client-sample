interface SearchFieldProps {
  readonly id: string
  readonly label: string
  readonly placeholder?: string
  readonly value: string
  readonly onChange: (value: string) => void
}

/**
 * A single search box in the filter bar's clothing.
 *
 * `FilterBar` serves list screens, whose filters live in the URL and apply on
 * submit because the API paginates server-side. A screen filtering a list it
 * already holds needs neither, but should still look like the rest.
 */
export function SearchField({ id, label, placeholder, value, onChange }: SearchFieldProps) {
  return (
    <div className="filterBar">
      <div className="filterBar__field">
        <label className="form-label small mb-1" htmlFor={id}>
          {label}
        </label>
        <input
          id={id}
          type="search"
          className="form-control form-control-sm"
          placeholder={placeholder}
          value={value}
          onChange={(event) => {
            onChange(event.target.value)
          }}
        />
      </div>
    </div>
  )
}
