import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { parse } from 'yaml'
import { describe, expect, it } from 'vitest'

import type {
  Album,
  AlbumCreateRequest,
  AlbumSoftDeleteRequest,
  AlbumUpdateRequest,
  AlbumView,
  ApiErrorPayload,
  HealthCheck,
  LoginRequest,
  Me,
  MePermissions,
  PaginatedPayload,
  Pagination,
  Permission,
  Photo,
  PhotoUpdateRequest,
  RefreshTokenRequest,
  RegisterRequest,
  Role,
  RoleAssignRequest,
  RoleCreateRequest,
  RoleUpdateRequest,
  RoleWithPermissions,
  TokenPair,
  User,
  UserCreateRequest,
  UserUpdateRequest,
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

/**
 * Strips the `readonly` our DTOs add and the generator does not, at every
 * depth, so the two sides can be compared on what the contract actually says.
 *
 * Without it `readonly string[]` never satisfies `string[]`, which is why the
 * type comparison below used to be applied only to the four schemas whose
 * fields are all scalars — and why `Pagination` went unchecked long enough to
 * disagree with the API about `from`/`to`.
 */
type Comparable<T> = T extends readonly (infer Element)[]
  ? Comparable<Element>[]
  : T extends object
    ? { -readonly [K in keyof T]: Comparable<T[K]> }
    : T

/** True when our field types match the spec's, ignoring its blanket optionality. */
type SameTypes<Ours, Theirs> = {
  [K in keyof Ours & keyof Theirs]: Comparable<Ours[K]> extends Comparable<Theirs[K]>
    ? true
    : { mismatch: K }
}[keyof Ours & keyof Theirs]

/** Same field names *and* same field types. */
type Mirrors<Ours, Theirs> =
  SameKeys<Ours, Theirs> extends true ? SameTypes<Ours, Theirs> : SameKeys<Ours, Theirs>

/*
 * Every schema the client has a DTO for, checked by `tsc` rather than at run
 * time — `make typecheck` fails on drift with the offending field named in the
 * error. Keyed by the schema's name in the document so the coverage test below
 * can tell which ones are missing.
 */
const MIRRORED = {
  User: true satisfies Mirrors<User, Schemas['User']>,
  UserWithAlbums: true satisfies Mirrors<UserWithAlbums, Schemas['UserWithAlbums']>,
  Me: true satisfies Mirrors<Me, Schemas['Me']>,
  MePermissions: true satisfies Mirrors<MePermissions, Schemas['MePermissions']>,
  UserCreateRequest: true satisfies Mirrors<UserCreateRequest, Schemas['UserCreateRequest']>,
  UserUpdateRequest: true satisfies Mirrors<UserUpdateRequest, Schemas['UserUpdateRequest']>,

  Album: true satisfies Mirrors<Album, Schemas['Album']>,
  AlbumView: true satisfies Mirrors<AlbumView, Schemas['AlbumView']>,
  AlbumCreateRequest: true satisfies Mirrors<AlbumCreateRequest, Schemas['AlbumCreateRequest']>,
  AlbumUpdateRequest: true satisfies Mirrors<AlbumUpdateRequest, Schemas['AlbumUpdateRequest']>,
  AlbumSoftDeleteRequest: true satisfies Mirrors<
    AlbumSoftDeleteRequest,
    Schemas['AlbumSoftDeleteRequest']
  >,

  Photo: true satisfies Mirrors<Photo, Schemas['Photo']>,
  PhotoUpdateRequest: true satisfies Mirrors<PhotoUpdateRequest, Schemas['PhotoUpdateRequest']>,

  Role: true satisfies Mirrors<Role, Schemas['Role']>,
  RoleWithPermissions: true satisfies Mirrors<RoleWithPermissions, Schemas['RoleWithPermissions']>,
  RoleCreateRequest: true satisfies Mirrors<RoleCreateRequest, Schemas['RoleCreateRequest']>,
  RoleUpdateRequest: true satisfies Mirrors<RoleUpdateRequest, Schemas['RoleUpdateRequest']>,
  RoleAssignRequest: true satisfies Mirrors<RoleAssignRequest, Schemas['RoleAssignRequest']>,
  Permission: true satisfies Mirrors<Permission, Schemas['Permission']>,

  LoginRequest: true satisfies Mirrors<LoginRequest, Schemas['LoginRequest']>,
  RegisterRequest: true satisfies Mirrors<RegisterRequest, Schemas['RegisterRequest']>,
  RefreshTokenRequest: true satisfies Mirrors<RefreshTokenRequest, Schemas['RefreshTokenRequest']>,
  // The client calls the pair what it is; the document names it after the
  // response that carries it.
  TokenResponse: true satisfies Mirrors<TokenPair, Schemas['TokenResponse']>,

  Pagination: true satisfies Mirrors<Pagination, Schemas['Pagination']>,
  // The one list envelope the document spells out in full. `PaginatedPayload`
  // is the same shape for every resource, so checking it once checks them all.
  AlbumListEnvelope: true satisfies Mirrors<
    PaginatedPayload<Album>,
    NonNullable<Schemas['AlbumListEnvelope']['data']>
  >,
  // These two are only ever the `data` of their envelope — the document does
  // not name them, so neither side can reference them by name.
  HealthEnvelope: true satisfies Mirrors<
    HealthCheck,
    NonNullable<Schemas['HealthEnvelope']['data']>
  >,
  ErrorEnvelope: true satisfies Mirrors<ApiErrorPayload, Schemas['ErrorEnvelope']['data']>,
} as const

/**
 * Schemas with no DTO behind them, and why.
 *
 * The envelope wrappers describe where a payload sits, not what it contains:
 * `baseQuery` unwraps `data` and `errors.ts` normalises the failure shapes, so
 * nothing above the transport ever sees one. `ValidationErrorEnvelope` refines
 * `ErrorEnvelope.error` to lists of strings, which is what `FieldErrors` is —
 * asserted in `tests/unit/api/errors.test.ts` against real responses instead.
 */
const NOT_MIRRORED = ['SuccessEnvelope', 'ValidationErrorEnvelope', 'TokenResponseEnvelope']

interface Spec {
  readonly components: { readonly schemas: Record<string, unknown> }
}

const spec = parse(readFileSync(join(import.meta.dirname, 'openapi.yaml'), 'utf8')) as Spec

describe('The DTOs mirror the API schemas', () => {
  it('is proven by the compiler, which is what `make typecheck` runs', () => {
    // The `satisfies` clauses above are the test; this keeps the file visible
    // in the suite rather than passing silently as part of the type check.
    expect(Object.values(MIRRORED)).not.toContain(false)
  })

  it('leaves no schema unaccounted for', () => {
    // Ten of twenty-five were checked before anyone counted, which is how
    // `Pagination` drifted. A schema the API adds now has to be placed.
    const accounted = new Set([...Object.keys(MIRRORED), ...NOT_MIRRORED])
    const unaccounted = Object.keys(spec.components.schemas).filter((name) => !accounted.has(name))

    expect(unaccounted).toEqual([])
  })
})
