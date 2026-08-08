import { useCallback, useState } from 'react'

export interface ToggleSelection {
  readonly selected: readonly string[]
  readonly toggle: (name: string) => void
  /** Selects nothing — for a full replacement, that means revoking everything. */
  readonly clear: () => void
}

/**
 * A set of names being edited, starting from whatever the server says it is.
 *
 * The selection is *derived* until the user touches it, and only then becomes
 * local state. An effect copying the query's answer into state instead would
 * fight every refetch, overwriting edits the user had already made.
 */
export function useToggleSelection(derived: readonly string[]): ToggleSelection {
  const [edited, setEdited] = useState<readonly string[] | null>(null)
  const selected = edited ?? derived

  const toggle = useCallback(
    (name: string): void => {
      setEdited((current) => {
        const base = current ?? derived
        return base.includes(name) ? base.filter((item) => item !== name) : [...base, name]
      })
    },
    [derived],
  )

  const clear = useCallback((): void => {
    setEdited([])
  }, [])

  return { selected, toggle, clear }
}
