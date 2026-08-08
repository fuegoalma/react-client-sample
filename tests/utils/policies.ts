import { PermissionService } from '@/services'

/**
 * A caller holding exactly the listed permissions and nothing else — the shape
 * every policy suite needs, so none of them redefines it.
 *
 * Roles are left empty on purpose: the policies read permissions, never role
 * names, exactly as the API's `AccessControlService` does.
 */
export function checkerFor(...permissions: string[]): PermissionService {
  return new PermissionService([], permissions)
}
