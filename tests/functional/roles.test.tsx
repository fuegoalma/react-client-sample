import { screen, waitFor, within } from '@testing-library/react'
import { http } from 'msw'
import { describe, expect, it } from 'vitest'

import { PermissionsPage } from '@/pages/PermissionsPage'
import { RoleEditorPage } from '@/pages/roles/RoleEditorPage'
import { RolesPage } from '@/pages/roles/RolesPage'

import { db, grant, grantRole } from '../mocks/db'
import { conflict } from '../mocks/envelope'
import { server } from '../mocks/server'
import { renderWithProviders } from '../utils/renderWithProviders'

describe('Roles list', () => {
  it('shows an admin the catalog without the composition controls', async () => {
    // `role.index` lists; composing and inspecting need `role.manage`/`role.view`.
    grantRole('admin')
    renderWithProviders(<RolesPage />)

    expect(await screen.findByText('moderator')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /compose role/i })).not.toBeInTheDocument()
  })

  it('gives a super admin the composition controls', async () => {
    grantRole('super_admin')
    renderWithProviders(<RolesPage />)

    expect(await screen.findByRole('link', { name: /compose role/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'moderator' })).toBeInTheDocument()
  })

  it('offers no delete for a system role', async () => {
    grantRole('super_admin')
    renderWithProviders(<RolesPage />)

    const row = (await screen.findByRole('link', { name: 'moderator' })).closest('tr')
    expect(within(row!).queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
  })

  it('deletes a custom role', async () => {
    grantRole('super_admin')
    db.roles.push({
      id: 50,
      name: 'editor',
      description: 'Can edit any album',
      is_system: false,
      permissions: ['album.update.any'],
    })

    const { user } = renderWithProviders(<RolesPage />)

    const row = (await screen.findByRole('link', { name: 'editor' })).closest('tr')
    await user.click(within(row!).getByRole('button', { name: 'Delete' }))

    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(db.roles.some((role) => role.name === 'editor')).toBe(false)
    })
  })
})

describe('Composing a role', () => {
  it('creates a role from the permission catalog', async () => {
    grantRole('super_admin')
    const { user } = renderWithProviders(<RoleEditorPage />, { route: '/roles/new' })

    await user.type(await screen.findByLabelText('Name'), 'editor')
    await user.type(screen.getByLabelText('Description'), 'Can edit any album')
    await user.click(screen.getByLabelText(/album\.update\.any/))
    await user.click(screen.getByRole('button', { name: 'Create role' }))

    await waitFor(() => {
      const created = db.roles.find((role) => role.name === 'editor')
      expect(created?.permissions).toEqual(['album.update.any'])
      expect(created?.is_system).toBe(false)
    })
  })

  it('rejects a name the API would not accept, before sending it', async () => {
    grantRole('super_admin')
    const { user } = renderWithProviders(<RoleEditorPage />, { route: '/roles/new' })

    await user.type(await screen.findByLabelText('Name'), 'Editor Role')
    await user.click(screen.getByRole('button', { name: 'Create role' }))

    expect(
      await screen.findByText('Use lowercase letters, digits, underscores and hyphens only.'),
    ).toBeInTheDocument()
  })

  it('reports a duplicate name from the API on its field', async () => {
    grantRole('super_admin')
    const { user } = renderWithProviders(<RoleEditorPage />, { route: '/roles/new' })

    await user.type(await screen.findByLabelText('Name'), 'moderator')
    await user.click(screen.getByRole('button', { name: 'Create role' }))

    expect(await screen.findByText('Name has already been taken.')).toBeInTheDocument()
  })

  it('locks the name of a system role, which cannot be renamed', async () => {
    grantRole('super_admin')
    renderWithProviders(<RoleEditorPage />, { route: '/roles/1', path: '/roles/:roleId' })

    expect(await screen.findByLabelText('Name')).toBeDisabled()
    expect(screen.getByText('System roles cannot be renamed.')).toBeInTheDocument()
  })

  it('re-composes a system role, which is allowed', async () => {
    grantRole('super_admin')
    const { user } = renderWithProviders(<RoleEditorPage />, {
      route: '/roles/1',
      path: '/roles/:roleId',
    })

    await user.click(await screen.findByLabelText(/album\.restore/))
    await user.click(screen.getByRole('button', { name: 'Save role' }))

    await waitFor(() => {
      expect(db.roles.find((role) => role.id === 1)?.permissions).toContain('album.restore')
    })
  })

  it('surfaces the 409 that keeps someone able to manage roles', async () => {
    grantRole('super_admin')
    const { user } = renderWithProviders(<RoleEditorPage />, {
      route: '/roles/3',
      path: '/roles/:roleId',
    })

    // Stripping `role.manage` from super_admin would leave nobody holding it.
    await user.click(await screen.findByLabelText(/role\.manage/))
    await user.click(screen.getByRole('button', { name: 'Save role' }))

    expect(await screen.findByText(/no user able to manage roles/i)).toBeInTheDocument()
  })
})

describe('Permission catalog', () => {
  it('groups the catalog by resource', async () => {
    grantRole('super_admin')
    renderWithProviders(<PermissionsPage />)

    expect(await screen.findByRole('heading', { name: 'album' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'role' })).toBeInTheDocument()
    expect(screen.getByText('album.restore')).toBeInTheDocument()
  })

  it('searches by name', async () => {
    grantRole('super_admin')
    const { user } = renderWithProviders(<PermissionsPage />)

    await user.type(await screen.findByLabelText('Search'), 'restore')

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'role' })).not.toBeInTheDocument()
    })
    expect(screen.getByText('album.restore')).toBeInTheDocument()
  })
})

describe('When the API refuses a role change', () => {
  it('shows why a system role cannot be deleted', async () => {
    grantRole('super_admin')
    renderWithProviders(<RolesPage />)

    // The seeded roles are all system roles, so the button is not offered —
    // deletion is only reachable for a role the caller composed.
    const row = (await screen.findByText('moderator')).closest('tr')
    expect(within(row!).queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
  })

  it('surfaces a refusal raised while deleting a custom role', async () => {
    grantRole('super_admin')
    db.roles.push({
      id: 99,
      name: 'editor',
      description: 'A composed role',
      is_system: false,
      permissions: [],
    })
    server.use(
      http.delete('http://localhost:8084/roles/:id', () =>
        conflict('This would leave no user able to manage roles.'),
      ),
    )
    const { user } = renderWithProviders(<RolesPage />)

    const row = (await screen.findByText('editor')).closest('tr')
    await user.click(within(row!).getByRole('button', { name: 'Delete' }))
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }),
    )

    expect(
      await screen.findByText('This would leave no user able to manage roles.'),
    ).toBeInTheDocument()
    expect(db.roles.some((role) => role.id === 99)).toBe(true)
  })

  it('keeps the role when the confirmation is dismissed', async () => {
    grantRole('super_admin')
    db.roles.push({
      id: 99,
      name: 'editor',
      description: 'A composed role',
      is_system: false,
      permissions: [],
    })
    const { user } = renderWithProviders(<RolesPage />)

    const row = (await screen.findByText('editor')).closest('tr')
    await user.click(within(row!).getByRole('button', { name: 'Delete' }))
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel' }),
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(db.roles.some((role) => role.id === 99)).toBe(true)
  })
})

describe('A role catalog seen by someone who may read but not compose', () => {
  it('offers viewing rather than editing', async () => {
    // `role.view` without `role.manage`: the composition screen opens read-only.
    grant('role.index', 'role.view')
    renderWithProviders(<RolesPage />)

    const row = (await screen.findByText('moderator')).closest('tr')
    expect(within(row!).getByRole('link', { name: 'View' })).toBeInTheDocument()
    expect(within(row!).queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument()
  })

  it('keeps a system role’s name out of the request that re-composes it', async () => {
    // The field is locked and the name is withheld, so the two cannot disagree
    // and make the API answer 422.
    grantRole('super_admin')
    const { user } = renderWithProviders(<RoleEditorPage />, {
      route: '/roles/1',
      path: '/roles/:roleId',
    })

    expect(await screen.findByLabelText('Name')).toBeDisabled()
    await user.click(screen.getByRole('checkbox', { name: /album\.restore/ }))
    await user.click(screen.getByRole('button', { name: 'Save role' }))

    expect(await screen.findByText('Role updated.')).toBeInTheDocument()
    expect(db.roles.find((role) => role.id === 1)?.name).toBe('moderator')
  })
})

describe('A permission catalog with an unusual name', () => {
  it('groups a name with no resource prefix under itself', async () => {
    grantRole('super_admin')
    db.permissions = [{ name: 'legacy', description: 'An ungrouped permission' }]
    renderWithProviders(<PermissionsPage />)

    expect(await screen.findByRole('heading', { name: 'legacy' })).toBeInTheDocument()
  })
})

describe('Renaming a role that may be renamed', () => {
  it('sends the new name for a role the caller composed', async () => {
    grantRole('super_admin')
    db.roles.push({
      id: 99,
      name: 'editor',
      description: 'A composed role',
      is_system: false,
      permissions: [],
    })
    const { user } = renderWithProviders(<RoleEditorPage />, {
      route: '/roles/99',
      path: '/roles/:roleId',
    })

    const name = await screen.findByLabelText('Name')
    expect(name).toBeEnabled()
    await user.clear(name)
    await user.type(name, 'curator')
    await user.click(screen.getByRole('button', { name: 'Save role' }))

    expect(await screen.findByText('Role updated.')).toBeInTheDocument()
    expect(db.roles.find((role) => role.id === 99)?.name).toBe('curator')
  })
})
