import { Link, useNavigate, useParams } from 'react-router-dom'

import {
  FormAlert,
  FormField,
  PageHeader,
  QueryBoundary,
  SubmitButton,
  fieldClass,
} from '@/components'
import { PermissionPicker } from '@/components/roles/PermissionPicker'
import { roleCreateSchema, withoutEmpty, type RoleCreateValues } from '@/forms'
import { useApiForm, useNotifications, usePermissions, useToggleSelection } from '@/hooks'
import {
  useCreateRoleMutation,
  usePermissionsQuery,
  useRoleQuery,
  useUpdateRoleMutation,
} from '@/repositories'

/**
 * Composes a role from the permission catalog (`role.manage`, super admin).
 *
 * Create and edit are the same screen: the only difference is that a system
 * role cannot be renamed, which the API enforces and this reflects by locking
 * the name field.
 */
export function RoleEditorPage() {
  const { roleId } = useParams()
  const isNew = roleId === undefined
  const id = Number(roleId)
  const navigate = useNavigate()

  const { data: role, error, isLoading } = useRoleQuery(id, { skip: isNew || Number.isNaN(id) })
  const { data: catalog = [], isLoading: loadingCatalog } = usePermissionsQuery()

  const [createRole, { isLoading: isCreating }] = useCreateRoleMutation()
  const [updateRole, { isLoading: isUpdating }] = useUpdateRoleMutation()
  const { roles: policy } = usePermissions()
  const { reportSuccess } = useNotifications()

  // A system role may be re-composed but not renamed; until it has loaded there
  // is nothing to protect, so an unloaded role reads as renameable.
  const canRename = role === undefined || policy.canRename(role)

  const { selected, toggle } = useToggleSelection(
    (role?.permissions ?? []).map((permission) => permission.name),
  )

  const {
    register,
    handleSubmit,
    applyApiError,
    formState: { errors },
  } = useApiForm(
    roleCreateSchema,
    { name: '', description: '' },
    // Adopts the role once it arrives; `useForm`'s own mechanism for async
    // defaults, which is what an effect would otherwise be reimplementing.
    role === undefined ? undefined : { name: role.name, description: role.description },
  )

  const onSubmit = async (values: RoleCreateValues): Promise<void> => {
    try {
      if (isNew) {
        const created = await createRole({
          name: values.name,
          ...withoutEmpty({ description: values.description }),
          permissions: selected,
        }).unwrap()
        reportSuccess(`Role “${created.name}” was created.`)
        void navigate(`/roles/${created.id}`, { replace: true })
        return
      }

      await updateRole({
        id,
        body: {
          // The same rule that locks the field also keeps the name out of the
          // request, so the two cannot disagree and 422.
          ...(canRename ? { name: values.name } : {}),
          ...withoutEmpty({ description: values.description }),
          permissions: selected,
        },
      }).unwrap()
      reportSuccess('Role updated.')
    } catch (unknownError) {
      // 422 for an unknown permission name, 409 when the change would leave
      // nobody able to manage roles.
      applyApiError(unknownError)
    }
  }

  return (
    <QueryBoundary isLoading={(!isNew && isLoading) || loadingCatalog} error={error}>
      <PageHeader
        breadcrumbs={[
          { label: 'Roles', to: '/roles' },
          { label: isNew ? 'Compose a role' : (role?.name ?? '') },
        ]}
        title={isNew ? 'Compose a role' : `Role: ${role?.name ?? ''}`}
        subtitle="Pick the permissions this role grants. Access is flat — holders get the union of all their roles."
        actions={
          <Link className="btn btn-sm btn-outline-secondary" to="/roles">
            Back to roles
          </Link>
        }
      />

      <form
        className="appCard p-3"
        onSubmit={(event) => void handleSubmit(onSubmit)(event)}
        noValidate
      >
        <FormAlert error={errors.root} />

        <div className="row g-3">
          <div className="col-md-4">
            <FormField
              id="role-name"
              label="Name"
              error={errors.name}
              hint={canRename ? 'Lowercase, e.g. editor' : 'System roles cannot be renamed.'}
            >
              <input
                id="role-name"
                className={fieldClass(errors.name)}
                maxLength={64}
                disabled={!canRename}
                {...register('name')}
              />
            </FormField>
          </div>
          <div className="col-md-8">
            <FormField id="role-description" label="Description" error={errors.description}>
              <input
                id="role-description"
                className={fieldClass(errors.description)}
                maxLength={255}
                {...register('description')}
              />
            </FormField>
          </div>
        </div>

        <h2 className="h6 mt-2">Permissions ({selected.length} selected)</h2>
        <PermissionPicker catalog={catalog} selected={selected} onToggle={toggle} />

        <div className="mt-3">
          <SubmitButton
            isBusy={isCreating || isUpdating}
            label={isNew ? 'Create role' : 'Save role'}
            busyLabel="Saving…"
          />
        </div>
      </form>
    </QueryBoundary>
  )
}
