import type { FetchBaseQueryError, FetchBaseQueryMeta } from '@reduxjs/toolkit/query'
import { describe, expect, it } from 'vitest'

import { errorMessage, extractFieldErrors, isApiError, toApiError } from '@/api'

function envelope(code: number, data: unknown): FetchBaseQueryError {
  return { status: code, data: { success: false, data, code } }
}

function metaWith(headers: Record<string, string>): FetchBaseQueryMeta {
  return { response: new Response(null, { headers }) } as FetchBaseQueryMeta
}

/**
 * Every failure the UI renders passes through here, so this is where the API's
 * error envelope stops being the rest of the application's problem.
 */
describe('toApiError', () => {
  it('unwraps a validation error into per-field messages', () => {
    const error = toApiError(
      envelope(422, {
        message: 'An error occurred during execution',
        error: { email: ['Email has already been taken.'] },
      }),
    )

    expect(error.code).toBe(422)
    expect(error.fieldErrors).toEqual({ email: ['Email has already been taken.'] })
  })

  it('keeps a meaningful server message, such as a 409 conflict', () => {
    const error = toApiError(
      envelope(409, { message: 'This would leave no user able to manage roles.' }),
    )

    expect(error.message).toBe('This would leave no user able to manage roles.')
  })

  it('replaces Yii’s generic message with something a user can act on', () => {
    const error = toApiError(envelope(403, { message: 'An error occurred during execution' }))
    expect(error.message).toBe('You do not have permission to perform this action.')
  })

  it('falls back on a status message when the body carries none', () => {
    expect(toApiError(envelope(404, {})).message).toBe('The requested resource was not found.')
  })

  it('reads Retry-After off a rate-limited response', () => {
    const error = toApiError(envelope(429, {}), metaWith({ 'Retry-After': '30' }))
    expect(error.retryAfter).toBe(30)
  })

  it('leaves retryAfter unset when the header is absent or unparseable', () => {
    expect(toApiError(envelope(429, {})).retryAfter).toBeUndefined()
    expect(
      toApiError(envelope(429, {}), metaWith({ 'Retry-After': 'soon' })).retryAfter,
    ).toBeUndefined()
  })

  it('reports a network failure as code 0', () => {
    const error = toApiError({ status: 'FETCH_ERROR', error: 'Failed to fetch' })
    expect(error.code).toBe(0)
    expect(error.message).toContain('could not be reached')
  })

  it('reports a timeout distinctly', () => {
    const error = toApiError({ status: 'TIMEOUT_ERROR', error: 'timed out' })
    expect(error.code).toBe(0)
    expect(error.message).toContain('timed out')
  })

  it('uses the original status of an unparseable response', () => {
    const error = toApiError({
      status: 'PARSING_ERROR',
      originalStatus: 500,
      data: '<html>',
      error: 'Unexpected token',
    })
    expect(error.code).toBe(500)
  })

  it('never invents field errors from a debug trace', () => {
    // With YII_DEBUG on, `error` holds a stack trace, not validation messages.
    const error = toApiError(
      envelope(500, { message: 'Boom', error: { file: 'x.php', line: 12, trace: [] } }),
    )
    expect(error.fieldErrors).toEqual({ file: ['x.php'] })
  })
})

describe('extractFieldErrors', () => {
  it('accepts a bare string as a single message', () => {
    expect(extractFieldErrors({ title: 'Title cannot be blank.' })).toEqual({
      title: ['Title cannot be blank.'],
    })
  })

  it('drops values that are not messages', () => {
    expect(extractFieldErrors({ line: 12, trace: [{ file: 'x' }] })).toEqual({})
  })

  it('returns nothing when there is no error object', () => {
    expect(extractFieldErrors(undefined)).toEqual({})
  })
})

describe('isApiError and errorMessage', () => {
  it('recognises a normalised error', () => {
    expect(isApiError({ code: 404, message: 'Nope', fieldErrors: {} })).toBe(true)
  })

  it('rejects anything else', () => {
    expect(isApiError(null)).toBe(false)
    expect(isApiError('boom')).toBe(false)
    expect(isApiError({ code: 404 })).toBe(false)
  })

  it('falls back when handed something that is not an API error', () => {
    expect(errorMessage(new Error('x'), 'Could not load.')).toBe('Could not load.')
    expect(errorMessage({ code: 1, message: 'Real', fieldErrors: {} })).toBe('Real')
  })
})

describe('Statuses and bodies the API is not documented to send', () => {
  it('still explains a status it has no wording for', () => {
    expect(toApiError({ status: 418, data: {} }).message).toBe('An unexpected error occurred.')
  })

  it('reads an error body that was not wrapped in the envelope', () => {
    // Anything in front of the API — a proxy, a load balancer — may answer
    // without the wrapper the API itself always uses.
    const error = toApiError({ status: 502, data: { message: 'Bad gateway.' } })
    expect(error.message).toBe('Bad gateway.')
  })

  it('falls back to the status wording when the body is not an object at all', () => {
    expect(toApiError({ status: 500, data: 'plain text' }).message).toBe(
      'The server ran into an unexpected problem.',
    )
  })
})
