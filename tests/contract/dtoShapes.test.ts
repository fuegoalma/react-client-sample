import { describe, expect, it } from 'vitest'

import type {
  Album,
  AlbumView,
  Me,
  MePermissions,
  Permission,
  Photo,
  Role,
  RoleWithPermissions,
  User,
  UserWithAlbums,
} from '@/types'

import type { components } from './schema'

type Schemas = components['schemas']

/**
 * True when two objects describe the same field names.
 *
 * The API's schemas mark every property optional, so plain assignability is
 * one-directional and would let a whole missing field through. Comparing the
 * key sets in both directions is what actually catches drift: a field we
 * invented, and a field the API added or renamed.
 */
type SameKeys<Ours, Theirs> =
  Exclude<keyof Ours, keyof Theirs> extends never
    ? Exclude<keyof Theirs, keyof Ours> extends never
      ? true
      : { missingFromOurDto: Exclude<keyof Theirs, keyof Ours> }
    : { notInTheSpec: Exclude<keyof Ours, keyof Theirs> }

/** True when our field types match the spec's, ignoring its blanket optionality. */
type SameTypes<Ours, Theirs> = {
  [K in keyof Ours & keyof Theirs]: Ours[K] extends Theirs[K] ? true : { mismatch: K }
}[keyof Ours & keyof Theirs]

/*
 * These are checked by `tsc`, not at run time — `make typecheck` fails on drift
 * with the offending field named in the error. The suite below re-states the
 * same guarantees for anything a type cannot express.
 */
const _user: SameKeys<User, Schemas['User']> = true
const _album: SameKeys<Album, Schemas['Album']> = true
const _albumView: SameKeys<AlbumView, Schemas['AlbumView']> = true
const _photo: SameKeys<Photo, Schemas['Photo']> = true
const _role: SameKeys<Role, Schemas['Role']> = true
const _roleWithPermissions: SameKeys<RoleWithPermissions, Schemas['RoleWithPermissions']> = true
const _permission: SameKeys<Permission, Schemas['Permission']> = true
const _userWithAlbums: SameKeys<UserWithAlbums, Schemas['UserWithAlbums']> = true
const _me: SameKeys<Me, Schemas['Me']> = true
const _mePermissions: SameKeys<MePermissions, Schemas['MePermissions']> = true

const _albumTypes: SameTypes<Album, Schemas['Album']> = true
const _photoTypes: SameTypes<Photo, Schemas['Photo']> = true
const _roleTypes: SameTypes<Role, Schemas['Role']> = true
const _permissionTypes: SameTypes<Permission, Schemas['Permission']> = true

describe('The DTOs mirror the API schemas', () => {
  it('is proven by the compiler, which is what `make typecheck` runs', () => {
    // The assertions above are the test; this keeps the file visible in the
    // suite rather than passing silently as part of the type check.
    expect([
      _user,
      _album,
      _albumView,
      _photo,
      _role,
      _roleWithPermissions,
      _permission,
      _userWithAlbums,
      _me,
      _mePermissions,
      _albumTypes,
      _photoTypes,
      _roleTypes,
      _permissionTypes,
    ]).not.toContain(false)
  })
})
