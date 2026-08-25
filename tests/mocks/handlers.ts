import { http, HttpResponse } from 'msw'

import type { Album, AlbumView, Me, MePermissions, Photo, Role, User } from '@/types'

import {
  API_ORIGIN,
  CURRENT_USER_ID,
  db,
  mockNow,
  nextId,
  type MockAlbum,
  type MockPhoto,
  type MockRole,
  type MockUser,
} from './db'
import { authed, byId, can, canOn } from './guards'
import {
  conflict,
  created,
  fail,
  forbidden,
  noContent,
  notFound,
  ok,
  paginate,
  tooManyRequests,
  unauthorized,
  unprocessable,
} from './envelope'

const BASE = API_ORIGIN

/* -- helpers --------------------------------------------------------------- */

function toAlbum(album: MockAlbum): Album {
  return {
    id: album.id,
    title: album.title,
    is_deleted: album.is_deleted,
    delete_reason: album.delete_reason,
    created_at: album.created_at,
    updated_at: album.updated_at,
  }
}

function toPhoto(photo: MockPhoto): Photo {
  return { id: photo.id, title: photo.title, url: photo.url, created_at: photo.created_at }
}

function toUser(user: MockUser): User {
  return {
    id: user.id,
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    created_at: user.created_at,
    updated_at: user.updated_at,
    email_verified: user.email_verified,
  }
}

function toRole(role: MockRole): Role {
  return {
    id: role.id,
    name: role.name,
    description: role.description,
    is_system: role.is_system,
  }
}

function issuePair(userId: number) {
  const suffix = nextId()
  const pair = { accessToken: `access-token-${suffix}`, refreshToken: `refresh-token-${suffix}` }
  db.sessions.push({ ...pair, userId })

  return {
    access_token: pair.accessToken,
    refresh_token: pair.refreshToken,
    token_type: 'Bearer',
    expires_in: 3600,
  }
}

/** Every album visible to the caller: soft-deleted ones need the review audience. */
function visibleAlbums(): MockAlbum[] {
  return db.albums.filter((album) => !album.is_deleted || can('album.view.any'))
}

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

/**
 * Creates an account from a request body, or reports the one thing the API
 * checks that the client cannot: that the email is still free.
 *
 * Registration and an administrator's create differ only in what they answer
 * with — the account they make is the same, with no roles either way.
 */
function createMockUser(body: Record<string, string | undefined>): MockUser | Response {
  if (db.users.some((candidate) => candidate.email === body['email'])) {
    return unprocessable({ email: ['Email has already been taken.'] })
  }

  const user: MockUser = {
    id: nextId(),
    first_name: body['first_name'] ?? '',
    last_name: body['last_name'] ?? '',
    email: body['email'] ?? '',
    password: body['password'] ?? '',
    roles: [],
    created_at: mockNow(),
    updated_at: mockNow(),
    // A fresh account is unconfirmed: the API queues the message and records
    // nothing until the token comes back.
    email_verified: false,
  }
  db.users.push(user)
  return user
}

/* -- handlers -------------------------------------------------------------- */

export const handlers = [
  /* ---- Auth ---- */

  http.post(`${BASE}/auth/login`, async ({ request }) => {
    if (db.rateLimited) return tooManyRequests()

    const body = (await request.json()) as { email?: string; password?: string }
    const user = db.users.find((candidate) => candidate.email === body.email)

    if (user === undefined || user.password !== body.password) return unauthorized()
    return ok(issuePair(user.id))
  }),

  http.post(`${BASE}/auth/register`, async ({ request }) => {
    if (db.rateLimited) return tooManyRequests()

    const created_ = createMockUser((await request.json()) as Record<string, string | undefined>)
    if (created_ instanceof Response) return created_

    return created(issuePair(created_.id))
  }),

  http.post(`${BASE}/auth/refresh`, async ({ request }) => {
    const body = (await request.json()) as { refresh_token?: string }
    if (db.refreshFails) return unauthorized()

    const index = db.sessions.findIndex((session) => session.refreshToken === body.refresh_token)
    if (index === -1) return unauthorized()

    // Rotation: the presented token is single-use.
    const [session] = db.sessions.splice(index, 1)
    return ok(issuePair(session?.userId ?? CURRENT_USER_ID))
  }),

  http.post(`${BASE}/auth/logout`, async ({ request }) => {
    const body = (await request.json()) as { refresh_token?: string }
    db.sessions = db.sessions.filter((session) => session.refreshToken !== body.refresh_token)
    return noContent()
  }),

  http.post(`${BASE}/auth/logout-all`, () => {
    db.sessions = []
    return noContent()
  }),

  /* ---- Health ---- */

  http.get(`${BASE}/health`, () => {
    const payload = { status: db.health, checks: { database: db.health } }
    return db.health === 'ok'
      ? ok(payload)
      : HttpResponse.json({ success: false, data: payload, code: 503 }, { status: 503 })
  }),

  /* ---- Current user ---- */

  http.get(
    `${BASE}/users/me`,
    authed(({ caller }) => {
      const me: Me = {
        ...toUser(caller),
        albums: db.albums.filter((album) => album.user_id === caller.id).map(toAlbum),
        roles: caller.roles,
      }
      return ok(me)
    }),
  ),

  http.get(
    `${BASE}/users/me/permissions`,
    authed(({ caller }) => {
      const payload: MePermissions = { roles: caller.roles, permissions: db.callerPermissions }
      return ok(payload)
    }),
  ),

  /* ---- Users ---- */

  http.get(
    `${BASE}/users`,
    authed.requiring('user.index.any', ({ request }) => {
      return paginate({
        url: new URL(request.url),
        items: db.users.map(toUser),
        likeFilters: ['first_name', 'last_name', 'email'],
        sortable: ['id', 'first_name', 'last_name', 'email', 'created_at', 'updated_at'],
      })
    }),
  ),

  http.post(
    `${BASE}/users`,
    authed.requiring('user.create', async ({ request }) => {
      const user = createMockUser((await request.json()) as Record<string, string | undefined>)
      if (user instanceof Response) return user

      return created(toUser(user))
    }),
  ),

  http.get(
    `${BASE}/users/:id`,
    authed.requiring('user.view.any', ({ params }) => {
      const user = byId(db.users, params['id'])
      if (user === undefined) return notFound()

      return ok({
        ...toUser(user),
        albums: db.albums.filter((album) => album.user_id === user.id).map(toAlbum),
      })
    }),
  ),

  http.put(
    `${BASE}/users/:id`,
    authed(async ({ request, params, caller }) => {
      const user = byId(db.users, params['id'])
      if (user === undefined) return notFound()
      if (!canOn('user.update', user.id, caller.id)) return forbidden()

      const body = (await request.json()) as Record<string, string | undefined>
      if (
        body['email'] !== undefined &&
        db.users.some((candidate) => candidate.email === body['email'] && candidate.id !== user.id)
      ) {
        return unprocessable({ email: ['Email has already been taken.'] })
      }

      Object.assign(user, body)
      return ok(toUser(user))
    }),
  ),

  http.delete(
    `${BASE}/users/:id`,
    authed.requiring('user.delete.any', ({ params }) => {
      const id = Number(params['id'])
      const user = db.users.find((candidate) => candidate.id === id)
      if (user === undefined) return notFound()

      // The last-role-manager invariant.
      if (user.roles.includes('super_admin')) {
        const managers = db.users.filter((candidate) => candidate.roles.includes('super_admin'))
        if (managers.length <= 1) {
          return conflict('This would leave no user able to manage roles.')
        }
      }

      db.users = db.users.filter((candidate) => candidate.id !== id)
      db.albums = db.albums.filter((album) => album.user_id !== id)
      return noContent()
    }),
  ),

  http.get(
    `${BASE}/users/:id/roles`,
    authed.requiring('role.assign', ({ params }) => {
      const user = byId(db.users, params['id'])
      if (user === undefined) return notFound()

      return ok(db.roles.filter((role) => user.roles.includes(role.name)).map(toRole))
    }),
  ),

  http.put(
    `${BASE}/users/:id/roles`,
    authed.requiring('role.assign', async ({ request, params }) => {
      const user = byId(db.users, params['id'])
      if (user === undefined) return notFound()

      const body = (await request.json()) as { roles?: string[] }
      const names = body.roles ?? []

      const unknown = names.filter((name) => !db.roles.some((role) => role.name === name))
      if (unknown.length > 0) {
        return unprocessable({ roles: [`Unknown role: ${unknown.join(', ')}.`] })
      }

      // Anti-escalation: assigning without managing cannot hand out role powers.
      if (!can('role.manage')) {
        const privileged = names.some((name) =>
          db.roles
            .find((role) => role.name === name)
            ?.permissions.some(
              (permission) => permission === 'role.manage' || permission === 'role.assign',
            ),
        )
        if (privileged) return forbidden()
      }

      user.roles = names
      return ok(db.roles.filter((role) => names.includes(role.name)).map(toRole))
    }),
  ),

  /* ---- Albums ---- */

  http.get(
    `${BASE}/albums/my`,
    authed(({ request, caller }) => {
      return paginate({
        url: new URL(request.url),
        items: db.albums
          .filter((album) => album.user_id === caller.id && !album.is_deleted)
          .map(toAlbum),
        likeFilters: ['title'],
        sortable: ['id', 'title', 'created_at', 'updated_at'],
      })
    }),
  ),

  http.get(
    `${BASE}/albums`,
    authed.requiring('album.index.any', ({ request }) => {
      const url = new URL(request.url)
      const wantsDeleted = url.searchParams.get('is_deleted') === '1'

      return paginate({
        url,
        items: visibleAlbums()
          .filter((album) => album.is_deleted === wantsDeleted)
          // `user_id` rides along for the filter only: the API accepts it as a
          // filter but stopped accepting it as a sort, and never returns it.
          .map((album) => ({ ...toAlbum(album), user_id: album.user_id })),
        likeFilters: ['title'],
        exactFilters: ['user_id'],
        sortable: ['id', 'title', 'created_at', 'updated_at'],
      })
    }),
  ),

  http.post(
    `${BASE}/albums`,
    authed(async ({ request, caller }) => {
      const body = (await request.json()) as { title?: string }
      if (body.title === undefined || body.title === '') {
        return unprocessable({ title: ['Title cannot be blank.'] })
      }

      const album: MockAlbum = {
        id: nextId(),
        user_id: caller.id,
        title: body.title,
        is_deleted: false,
        delete_reason: null,
        created_at: mockNow(),
        updated_at: mockNow(),
      }
      db.albums.push(album)
      return created(toAlbum(album))
    }),
  ),

  http.get(
    `${BASE}/albums/:id`,
    authed(({ params, caller }) => {
      const album = byId(db.albums, params['id'])
      if (album === undefined) return notFound()
      // A flagged album is a 404 for its owner until it is restored.
      if (album.is_deleted && !can('album.view.any')) return notFound()
      if (!canOn('album.view', album.user_id, caller.id)) return forbidden()

      const owner = db.users.find((user) => user.id === album.user_id)
      const view: AlbumView = {
        ...toAlbum(album),
        first_name: owner?.first_name ?? '',
        last_name: owner?.last_name ?? '',
        photos: db.photos.filter((photo) => photo.album_id === album.id).map(toPhoto),
      }
      return ok(view)
    }),
  ),

  http.put(
    `${BASE}/albums/:id`,
    authed(async ({ request, params, caller }) => {
      const album = byId(db.albums, params['id'])
      if (album === undefined) return notFound()
      if (!canOn('album.update', album.user_id, caller.id)) return forbidden()

      const body = (await request.json()) as { title?: string }
      if (body.title === '') return unprocessable({ title: ['Title cannot be blank.'] })
      if (body.title !== undefined) album.title = body.title

      return ok(toAlbum(album))
    }),
  ),

  http.delete(
    `${BASE}/albums/:id`,
    authed(async ({ request, params, caller }) => {
      const album = byId(db.albums, params['id'])
      if (album === undefined) return notFound()

      const permanent = album.user_id === caller.id || can('album.delete.any')
      const soft = can('album.soft-delete.any')
      if (!permanent && !soft) return forbidden()

      if (permanent) {
        db.albums = db.albums.filter((candidate) => candidate.id !== album.id)
        db.photos = db.photos.filter((photo) => photo.album_id !== album.id)
        return noContent()
      }

      const body = (await request.json().catch(() => ({}))) as { reason?: string }
      album.is_deleted = true
      album.delete_reason = body.reason ?? null
      return noContent()
    }),
  ),

  http.post(
    `${BASE}/albums/:id/restore`,
    authed.requiring('album.restore', ({ params }) => {
      const album = byId(db.albums, params['id'])
      if (album === undefined) return notFound()

      album.is_deleted = false
      album.delete_reason = null
      return ok(toAlbum(album))
    }),
  ),

  /* ---- Photos ---- */

  http.get(
    `${BASE}/albums/:albumId/photos`,
    authed(({ request, params, caller }) => {
      const album = byId(db.albums, params['albumId'])
      if (album === undefined) return notFound()
      if (!canOn('photo.view', album.user_id, caller.id)) return forbidden()

      return paginate({
        url: new URL(request.url),
        items: db.photos.filter((photo) => photo.album_id === album.id).map(toPhoto),
        likeFilters: ['title'],
        sortable: ['id', 'title', 'created_at'],
      })
    }),
  ),

  http.post(
    `${BASE}/albums/:albumId/photos`,
    authed(async ({ request, params, caller }) => {
      const album = byId(db.albums, params['albumId'])
      if (album === undefined) return notFound()
      if (!canOn('photo.create', album.user_id, caller.id)) return forbidden()

      const form = await request.formData()
      const titleField = form.get('title')
      const title = typeof titleField === 'string' ? titleField : ''
      const file = form.get('file')

      if (title === '') return unprocessable({ title: ['Title cannot be blank.'] })
      if (!(file instanceof File)) return unprocessable({ file: ['A file is required.'] })

      const photo: MockPhoto = {
        id: nextId(),
        album_id: album.id,
        title,
        url: `${BASE}/uploads/albums/${album.id}/${slugify(title)}.webp`,
        created_at: mockNow(),
      }
      db.photos.push(photo)
      return created(toPhoto(photo))
    }),
  ),

  http.get(
    `${BASE}/photos/:id`,
    authed(({ params, caller }) => {
      const photo = byId(db.photos, params['id'])
      if (photo === undefined) return notFound()

      const album = db.albums.find((candidate) => candidate.id === photo.album_id)
      if (!canOn('photo.view', album?.user_id ?? -1, caller.id)) return forbidden()

      return ok(toPhoto(photo))
    }),
  ),

  http.put(
    `${BASE}/photos/:id`,
    authed(async ({ request, params, caller }) => {
      const photo = byId(db.photos, params['id'])
      if (photo === undefined) return notFound()

      const album = db.albums.find((candidate) => candidate.id === photo.album_id)
      if (!canOn('photo.update', album?.user_id ?? -1, caller.id)) return forbidden()

      const body = (await request.json()) as { title?: string }
      if (body.title === '') return unprocessable({ title: ['Title cannot be blank.'] })
      if (body.title !== undefined) photo.title = body.title

      return ok(toPhoto(photo))
    }),
  ),

  http.delete(
    `${BASE}/photos/:id`,
    authed(({ params, caller }) => {
      const photo = byId(db.photos, params['id'])
      if (photo === undefined) return notFound()

      const album = db.albums.find((candidate) => candidate.id === photo.album_id)
      if (!canOn('photo.delete', album?.user_id ?? -1, caller.id)) return forbidden()

      db.photos = db.photos.filter((candidate) => candidate.id !== photo.id)
      return noContent()
    }),
  ),

  /* ---- Roles & permissions ---- */

  http.get(
    `${BASE}/roles`,
    authed.requiring('role.index', ({ request }) => {
      return paginate({
        url: new URL(request.url),
        items: db.roles.map(toRole),
        likeFilters: ['name'],
        sortable: ['id', 'name'],
      })
    }),
  ),

  http.post(
    `${BASE}/roles`,
    authed.requiring('role.manage', async ({ request }) => {
      const body = (await request.json()) as {
        name?: string
        description?: string
        permissions?: string[]
      }

      if (db.roles.some((role) => role.name === body.name)) {
        return unprocessable({ name: ['Name has already been taken.'] })
      }

      const unknown = (body.permissions ?? []).filter(
        (name) => !db.permissions.some((permission) => permission.name === name),
      )
      if (unknown.length > 0) {
        return unprocessable({ permissions: [`Unknown permission: ${unknown.join(', ')}.`] })
      }

      const role: MockRole = {
        id: nextId(),
        name: body.name ?? '',
        description: body.description ?? '',
        is_system: false,
        permissions: body.permissions ?? [],
      }
      db.roles.push(role)
      return created(toRole(role))
    }),
  ),

  http.get(
    `${BASE}/roles/:id`,
    authed.requiring('role.view', ({ params }) => {
      const role = byId(db.roles, params['id'])
      if (role === undefined) return notFound()

      return ok({
        ...toRole(role),
        permissions: db.permissions.filter((permission) =>
          role.permissions.includes(permission.name),
        ),
      })
    }),
  ),

  http.put(
    `${BASE}/roles/:id`,
    authed.requiring('role.manage', async ({ request, params }) => {
      const role = byId(db.roles, params['id'])
      if (role === undefined) return notFound()

      const body = (await request.json()) as {
        name?: string
        description?: string
        permissions?: string[]
      }

      if (role.is_system && body.name !== undefined && body.name !== role.name) {
        return unprocessable({ name: ['A system role cannot be renamed.'] })
      }

      // Re-composing must not strip the last role manager's power.
      if (
        role.name === 'super_admin' &&
        body.permissions !== undefined &&
        !body.permissions.includes('role.manage')
      ) {
        return conflict('This would leave no user able to manage roles.')
      }

      if (body.name !== undefined) role.name = body.name
      if (body.description !== undefined) role.description = body.description
      if (body.permissions !== undefined) role.permissions = body.permissions

      return ok(toRole(role))
    }),
  ),

  http.delete(
    `${BASE}/roles/:id`,
    authed.requiring('role.manage', ({ params }) => {
      const role = byId(db.roles, params['id'])
      if (role === undefined) return notFound()
      if (role.is_system) return conflict('A system role cannot be deleted.')

      db.roles = db.roles.filter((candidate) => candidate.id !== role.id)
      return noContent()
    }),
  ),

  http.get(
    `${BASE}/permissions`,
    authed.requiring('permission.index', () => {
      return ok(db.permissions)
    }),
  ),

  /*
   * The API serves the files it stored, so the mock does too — otherwise every
   * photo in the demo renders as a broken image. jsdom never fetches an <img>,
   * so this exists for the browser build alone.
   */
  http.get(`${BASE}/uploads/*`, ({ request }) => {
    const path = new URL(request.url).pathname
    let seed = 0
    for (let index = 0; index < path.length; index += 1) seed += path.charCodeAt(index)

    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500">` +
      `<rect width="500" height="500" fill="hsl(${String(seed % 360)} 45% 62%)"/>` +
      `</svg>`

    return HttpResponse.text(svg, { headers: { 'Content-Type': 'image/svg+xml' } })
  }),

  /* Anything unmapped is a bug in a test, not a silent pass. */
  http.all(`${BASE}/*`, ({ request }) => fail(500, `Unhandled request: ${request.url}`)),
]
