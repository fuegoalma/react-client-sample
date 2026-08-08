import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { parse } from 'yaml'
import { describe, expect, it } from 'vitest'

const SPEC_PATH = join(import.meta.dirname, 'openapi.yaml')
const SRC = join(import.meta.dirname, '..', '..', 'src')

/*
 * Repositories are the only layer that knows URLs — with one deliberate
 * exception: the transport issues `POST /auth/refresh` itself, because a
 * repository call would go back through the very re-authentication it is
 * trying to perform.
 */
const CALLING_LAYERS = ['repositories', 'api']

interface Operation {
  readonly description?: string
  readonly parameters?: readonly ({ name?: string; $ref?: string } | undefined)[]
}
interface Spec {
  readonly paths: Record<string, Record<string, Operation>>
}

const spec = parse(readFileSync(SPEC_PATH, 'utf8')) as Spec

/**
 * `/albums/{id}` and `` `/albums/${id}` `` are the same route written in two
 * notations. Reducing both to `/albums/{}` compares the shape, which is the
 * part either side could get wrong.
 */
function shape(path: string): string {
  return path.replace(/\$\{[^}]*\}/g, '{}').replace(/\{[^}]*\}/g, '{}')
}

/** Every `url` + `method` pair the client actually issues, read from the source. */
function declaredCalls(): { file: string; call: string }[] {
  return CALLING_LAYERS.flatMap((layer) => {
    const directory = join(SRC, layer)

    return readdirSync(directory)
      .filter((file) => file.endsWith('.ts') && file !== 'index.ts')
      .flatMap((file) => {
        const source = readFileSync(join(directory, file), 'utf8')
        return [...source.matchAll(/url:\s*[`'"]([^`'"]+)[`'"],\s*method:\s*'([A-Z]+)'/g)].map(
          (match) => ({
            file: `${layer}/${file}`,
            call: `${match[2] ?? ''} ${shape(match[1] ?? '')}`,
          }),
        )
      })
  })
}

/** Every operation the spec describes, minus the PATCH aliases of a PUT. */
function specCalls(): string[] {
  return Object.entries(spec.paths).flatMap(([path, operations]) =>
    Object.keys(operations)
      .filter((method) => method !== 'parameters' && method !== 'patch')
      .map((method) => `${method.toUpperCase()} ${shape(path)}`),
  )
}

describe('Every call the client makes is described by the spec', () => {
  it('issues no request the API does not document', () => {
    const known = new Set(specCalls())
    const unknown = declaredCalls().filter(({ call }) => !known.has(call))

    expect(unknown).toEqual([])
  })

  it('leaves no operation unused, which is what the README claims', () => {
    // PATCH is excluded deliberately: on this API it is an alias of PUT.
    const used = new Set(declaredCalls().map(({ call }) => call))
    const unused = specCalls().filter((call) => !used.has(call))

    expect(unused).toEqual([])
  })
})
