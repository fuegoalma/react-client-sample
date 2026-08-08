import { builtinEnvironments, type Environment } from 'vitest/environments'

/**
 * jsdom, but with the globals that `fetch` brand-checks left as Node's.
 *
 * jsdom has no `fetch`, so requests go through Node's (undici). undici verifies
 * that the values it is handed are its *own* classes, and jsdom installs
 * look-alikes over them — so under the stock jsdom environment every request
 * fails with "Expected signal to be an instance of AbortSignal", and every
 * photo upload is sent without its multipart boundary.
 *
 * `File` and `Blob` have to move with the signal: an upload builds a `FormData`
 * from a `File` taken off a file input, and undici rejects the whole body if
 * any part of it is jsdom's.
 */
const FETCH_GLOBALS = ['AbortController', 'AbortSignal', 'Blob', 'File'] as const

/**
 * `FormData` cannot simply be swapped: React DOM constructs one *from a form
 * element* on every submit, which Node's implementation does not accept, while
 * undici only accepts its own. This routes each caller to the one it needs —
 * Node's for `new FormData()`, jsdom's for `new FormData(form)`.
 */
function hybridFormData(
  NodeFormData: typeof FormData,
  JsdomFormData: typeof FormData,
): typeof FormData {
  return class HybridFormData extends NodeFormData {
    constructor(form?: HTMLFormElement, submitter?: HTMLElement | null) {
      super()
      if (form !== undefined) {
        // Returning another object from a constructor is what makes the
        // delegation invisible to the caller.
        return new JsdomFormData(form, submitter)
      }
    }
  }
}

const environment: Environment = {
  name: 'jsdom-node-fetch',
  transformMode: 'web',

  async setup(global, options) {
    const scope = global as typeof globalThis

    // Captured before jsdom overwrites them.
    const nodeGlobals = Object.fromEntries(FETCH_GLOBALS.map((key) => [key, scope[key]]))
    const nodeFormData = scope.FormData

    const { teardown } = await builtinEnvironments.jsdom.setup(global, options)

    Object.assign(scope, nodeGlobals)
    scope.FormData = hybridFormData(nodeFormData, scope.FormData)

    // jsdom implements neither (the DOM types claim otherwise), and the upload
    // preview uses both.
    scope.URL.createObjectURL = () => `blob:mock/${Math.random().toString(36).slice(2)}`
    scope.URL.revokeObjectURL = () => undefined

    // jsdom has no `matchMedia` either, and the theme asks it what the
    // operating system prefers. The default answer is "light", which keeps the
    // rest of the suite rendering the theme it was written against; the theme's
    // own tests stub this global to drive both answers.
    scope.matchMedia = (query: string) =>
      ({
        media: query,
        matches: false,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      }) as MediaQueryList

    return { teardown }
  },
}

export default environment
