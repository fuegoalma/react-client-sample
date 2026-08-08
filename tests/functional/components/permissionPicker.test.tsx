import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { PermissionPicker } from '@/components/roles/PermissionPicker'
import type { Permission } from '@/types'

import { renderWithProviders } from '../../utils/renderWithProviders'

const catalog: readonly Permission[] = [
  { name: 'album.index.any', description: 'List every album' },
  { name: 'role.manage', description: 'Compose, edit and delete roles' },
]

describe('PermissionPicker', () => {
  it('lists the catalog with what each permission grants', () => {
    renderWithProviders(<PermissionPicker catalog={catalog} selected={[]} onToggle={vi.fn()} />)

    expect(screen.getByText('album.index.any')).toBeInTheDocument()
    expect(screen.getByText('Compose, edit and delete roles')).toBeInTheDocument()
  })

  it('ticks exactly the permissions the role already carries', () => {
    renderWithProviders(
      <PermissionPicker catalog={catalog} selected={['role.manage']} onToggle={vi.fn()} />,
    )

    expect(screen.getByRole('checkbox', { name: /album\.index\.any/ })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: /role\.manage/ })).toBeChecked()
  })

  it('reports the permission that was toggled', async () => {
    const onToggle = vi.fn()
    const { user } = renderWithProviders(
      <PermissionPicker catalog={catalog} selected={[]} onToggle={onToggle} />,
    )

    await user.click(screen.getByRole('checkbox', { name: /role\.manage/ }))

    expect(onToggle).toHaveBeenCalledWith('role.manage')
  })

  it('says so when the API returned no permissions at all', () => {
    // An empty catalog is a broken deployment, not an empty form — saying
    // nothing would look like a role that grants nothing.
    renderWithProviders(<PermissionPicker catalog={[]} selected={[]} onToggle={vi.fn()} />)

    expect(screen.getByText('The permission catalog is empty.')).toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })

  it('locks the whole set when the caller may only read it', () => {
    renderWithProviders(
      <PermissionPicker catalog={catalog} selected={[]} onToggle={vi.fn()} disabled />,
    )

    expect(screen.getByRole('checkbox', { name: /role\.manage/ })).toBeDisabled()
  })
})
