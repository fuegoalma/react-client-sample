import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { parse } from 'yaml'
import { describe, expect, it } from 'vitest'

import {
  ALBUM_DELETION_FILTER,
  albumListSpec,
  photoListSpec,
  roleListSpec,
  userListSpec,
  withFilter,
  type ListSpec,
} from '@/forms'

interface Parameter {
  readonly name?: string
  readonly description?: string
  readonly $ref?: string
}
interface Operation {
  readonly parameters?: readonly Parameter[]
}
interface Spec {
  readonly paths: Record<string, Record<string, Operation>>
  readonly components: { readonly parameters: Record<string, Parameter> }
}

const spec = parse(readFileSync(join(import.meta.dirname, 'openapi.yaml'), 'utf8')) as Spec

/**
 * Query parameters a resource accepts, with `$ref`s resolved — `page`,
 * `per_page` and the album sort are all shared definitions, so reading only the
 * inline ones would silently see an endpoint as taking nothing.
 */
function queryParameters(path: string): readonly Parameter[] {
  return (spec.paths[path]?.['get']?.parameters ?? []).map((parameter) => {
    const name = parameter.$ref?.split('/').at(-1)
    return name === undefined ? parameter : (spec.components.parameters[name] ?? parameter)
  })
}

/**
 * Parameters the API offers that the client deliberately does not.
 *
 * `user_id` on the all-albums screen is the documented one: an album list
 * response carries no owner, so there would be no column to filter against —
 * and "this user's albums" is what their own page already answers.
 */
const NOT_OFFERED: Readonly<Record<string, readonly string[]>> = {
  '/albums': ['user_id'],
}

function filterNames(path: string): string[] {
  const skipped = new Set(['sort', 'page', 'per_page', ...(NOT_OFFERED[path] ?? [])])

  return queryParameters(path)
    .map((parameter) => parameter.name ?? '')
    .filter((name) => name !== '' && !skipped.has(name))
    .sort()
}

/**
 * The API states its `sortableAttributes()` whitelist in the `sort` parameter's
 * own description — "Allowed: `id`, `title`, …" — which is the only place the
 * document carries it. Reading it from there is what makes a change to that
 * list visible on this side.
 *
 * Only the `Allowed:` sentence is read, not every backtick in the description.
 * The rest of the prose names attributes too — "Defaults to `id` ascending" —
 * and taking those as part of the whitelist reported an attribute twice.
 */
function sortableAttributes(path: string): string[] {
  const description = queryParameters(path).find(
    (parameter) => parameter.name === 'sort',
  )?.description

  const allowed = /Allowed:([^.]*)/.exec(description ?? '')?.[1] ?? ''

  return [...allowed.matchAll(/`(-?[a-z_]+)`/g)]
    .map((match) => match[1] ?? '')
    .filter((name) => !name.startsWith('-'))
    .sort()
}

function assertMatches(spec: ListSpec, path: string): void {
  expect(spec.filters.map((filter) => filter.key).sort()).toEqual(filterNames(path))
  expect([...spec.sortable].sort()).toEqual(sortableAttributes(path))
}

/**
 * The `ListSpec`s are the client's transcription of each resource's search
 * form. `tests/unit/forms/listSpecs.test.ts` asserts they are internally
 * consistent; this asserts they still describe the API.
 */
describe('Every list spec matches the parameters its endpoint accepts', () => {
  it('users', () => {
    assertMatches(userListSpec, '/users')
  })

  it('albums, on both endpoints that share the spec', () => {
    assertMatches(albumListSpec, '/albums/my')
    // `/albums` additionally accepts the deletion filter, which the all-albums
    // screen composes in for a caller who can act on a flagged album.
    assertMatches(withFilter(albumListSpec, ALBUM_DELETION_FILTER), '/albums')
  })

  it('photos', () => {
    assertMatches(photoListSpec, '/albums/{albumId}/photos')
  })

  it('roles', () => {
    assertMatches(roleListSpec, '/roles')
  })
})
