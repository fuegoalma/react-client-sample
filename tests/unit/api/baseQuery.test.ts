import { describe, expect, it } from 'vitest'

import { unwrapEnvelope } from '@/api'

/**
 * The whole point of the transport: nothing above it should ever have to know
 * the API wraps its payloads.
 */
describe('unwrapEnvelope', () => {
  it('returns the payload of a success envelope', () => {
    expect(unwrapEnvelope({ success: true, data: { id: 1 }, code: 200 })).toEqual({ id: 1 })
  })

  it('passes a 204’s empty body straight through', () => {
    expect(unwrapEnvelope(null)).toBeNull()
  })

  it('leaves a body that is not an envelope alone', () => {
    expect(unwrapEnvelope({ id: 1 })).toEqual({ id: 1 })
    expect(unwrapEnvelope([1, 2])).toEqual([1, 2])
  })

  it('preserves a payload that is itself null', () => {
    expect(unwrapEnvelope({ success: true, data: null, code: 200 })).toBeNull()
  })
})
