import type { Permission } from '@/types'

interface PermissionPickerProps {
  readonly catalog: readonly Permission[]
  readonly selected: readonly string[]
  readonly onToggle: (name: string) => void
  readonly disabled?: boolean
}

/**
 * The permission catalog, as a multi-select. Permissions are defined by the
 * API's migrations and are read-only here — a role is *composed* from them,
 * never adds to them.
 */
export function PermissionPicker({
  catalog,
  selected,
  onToggle,
  disabled = false,
}: PermissionPickerProps) {
  if (catalog.length === 0) {
    return <p className="text-secondary small mb-0">The permission catalog is empty.</p>
  }

  return (
    <fieldset className="permissionPicker" disabled={disabled}>
      <legend className="visually-hidden">Permissions</legend>
      {catalog.map((permission) => (
        <div className="permissionPicker__item form-check" key={permission.name}>
          <input
            className="form-check-input"
            type="checkbox"
            id={`permission-${permission.name}`}
            checked={selected.includes(permission.name)}
            onChange={() => {
              onToggle(permission.name)
            }}
          />
          <label className="form-check-label" htmlFor={`permission-${permission.name}`}>
            <code>{permission.name}</code>
            <span className="permissionPicker__description">{permission.description}</span>
          </label>
        </div>
      ))}
    </fieldset>
  )
}
