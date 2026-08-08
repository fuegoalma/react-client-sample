import type { Permission } from '@/types'

/**
 * In-memory state behind the MSW handlers.
 *
 * It is deliberately a small re-implementation of the API's behaviour — the
 * envelope, pagination, RBAC gates and the two-token flow — rather than a bag
 * of canned responses, so a functional test exercises the same decisions the
 * real client will meet.
 */

export interface MockUser {
  id: number
  first_name: string
  last_name: string
  email: string
  password: string
  roles: string[]
}

export interface MockAlbum {
  id: number
  user_id: number
  title: string
  is_deleted: boolean
  delete_reason: string | null
  created_at: number
}

export interface MockPhoto {
  id: number
  album_id: number
  title: string
  url: string | null
  created_at: number
}

export interface MockRole {
  id: number
  name: string
  description: string
  is_system: boolean
  permissions: string[]
}

export interface MockSession {
  accessToken: string
  refreshToken: string
  userId: number
}

export interface MockState {
  users: MockUser[]
  albums: MockAlbum[]
  photos: MockPhoto[]
  roles: MockRole[]
  permissions: Permission[]
  sessions: MockSession[]
  /** Permissions of the authenticated caller (the union of their roles). */
  callerPermissions: string[]
  /**
   * Access tokens the API now rejects. Adding the live one makes the next
   * protected request 401, so the transport has to rotate the pair — which is
   * how the refresh flow is exercised for real.
   */
  expiredAccessTokens: string[]
  /** Refresh fails — the session is over and the client must sign in again. */
  refreshFails: boolean
  health: 'ok' | 'error'
  /** Set to answer the next mutation with a 429. */
  rateLimited: boolean
  nextId: number
}

export const CATALOG: readonly Permission[] = [
  { name: 'album.index.any', description: 'List every album' },
  { name: 'album.view.any', description: 'View any album' },
  { name: 'album.update.any', description: 'Update any album' },
  { name: 'album.delete.any', description: 'Permanently delete any album' },
  { name: 'album.soft-delete.any', description: 'Flag any album for review' },
  { name: 'album.restore', description: 'Restore a flagged album' },
  { name: 'photo.view.any', description: 'View any photo' },
  { name: 'photo.create.any', description: 'Upload into any album' },
  { name: 'photo.update.any', description: 'Update any photo' },
  { name: 'photo.delete.any', description: 'Delete any photo' },
  { name: 'user.index.any', description: 'List users' },
  { name: 'user.view.any', description: 'View any user' },
  { name: 'user.create', description: 'Create users' },
  { name: 'user.update.any', description: 'Update any user' },
  { name: 'user.delete.any', description: 'Delete any user' },
  { name: 'role.index', description: 'List roles' },
  { name: 'role.view', description: 'View a role with its permissions' },
  { name: 'role.manage', description: 'Compose, edit and delete roles' },
  { name: 'role.assign', description: 'Assign roles to users' },
  { name: 'permission.index', description: 'View the permission catalog' },
]

/** The API's three seeded roles, with the same permission sets. */
const SYSTEM_ROLES: readonly MockRole[] = [
  {
    id: 1,
    name: 'moderator',
    description: 'Can moderate albums and photos',
    is_system: true,
    permissions: [
      'user.index.any',
      'album.index.any',
      'album.view.any',
      'album.update.any',
      'album.soft-delete.any',
      'photo.view.any',
      'photo.create.any',
      'photo.update.any',
      'photo.delete.any',
    ],
  },
  {
    id: 2,
    name: 'admin',
    description: 'Full user CRUD and album review',
    is_system: true,
    permissions: [
      'user.index.any',
      'user.view.any',
      'user.create',
      'user.update.any',
      'user.delete.any',
      'album.index.any',
      'album.view.any',
      'album.update.any',
      'album.delete.any',
      'album.restore',
      'photo.view.any',
      'photo.create.any',
      'photo.update.any',
      'photo.delete.any',
      'role.index',
      'role.assign',
    ],
  },
  {
    id: 3,
    name: 'super_admin',
    description: 'Holds every permission',
    is_system: true,
    permissions: CATALOG.map((permission) => permission.name),
  },
]

export const ACCESS_TOKEN = 'access-token-1'
export const REFRESH_TOKEN = 'refresh-token-1'
export const CURRENT_USER_ID = 1

function seed(): MockState {
  return {
    users: [
      {
        id: CURRENT_USER_ID,
        first_name: 'Ada',
        last_name: 'Lovelace',
        email: 'ada@example.com',
        password: 'secret123',
        roles: [],
      },
      {
        id: 2,
        first_name: 'Grace',
        last_name: 'Hopper',
        email: 'grace@example.com',
        password: 'secret123',
        roles: [],
      },
    ],
    albums: [
      {
        id: 10,
        user_id: CURRENT_USER_ID,
        title: 'Vacation 2025',
        is_deleted: false,
        delete_reason: null,
        created_at: 2,
      },
      {
        id: 11,
        user_id: 2,
        title: 'Conference talks',
        is_deleted: false,
        delete_reason: null,
        created_at: 1,
      },
    ],
    photos: [
      {
        id: 100,
        album_id: 10,
        title: 'Beach sunset',
        url: 'http://localhost:8084/uploads/albums/10/a.webp',
        created_at: 1,
      },
    ],
    roles: SYSTEM_ROLES.map((role) => ({ ...role, permissions: [...role.permissions] })),
    permissions: [...CATALOG],
    sessions: [{ accessToken: ACCESS_TOKEN, refreshToken: REFRESH_TOKEN, userId: CURRENT_USER_ID }],
    callerPermissions: [],
    expiredAccessTokens: [],
    refreshFails: false,
    health: 'ok',
    rateLimited: false,
    nextId: 1000,
  }
}

export let db: MockState = seed()

export function resetDb(): void {
  db = seed()
}

/** Grants the caller a set of permissions, as a role would. */
export function grant(...permissions: readonly string[]): void {
  db.callerPermissions = [...permissions]
}

/** Grants the caller every permission one of the seeded roles carries. */
export function grantRole(name: 'moderator' | 'admin' | 'super_admin'): void {
  const role = db.roles.find((candidate) => candidate.name === name)
  db.callerPermissions = [...(role?.permissions ?? [])]
  const user = db.users.find((candidate) => candidate.id === CURRENT_USER_ID)
  if (user !== undefined) user.roles = [name]
}

export function nextId(): number {
  db.nextId += 1
  return db.nextId
}

/** Invalidates every access token currently issued, as expiry would. */
export function expireAccessTokens(): void {
  db.expiredAccessTokens = db.sessions.map((session) => session.accessToken)
}
