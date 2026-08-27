import { describe, expect, it } from 'vitest'

import { DateTime } from '@/services'

/**
 * The API sends `Y-m-d H:i:s`, which is not ISO-8601. These assertions are what
 * stops someone "simplifying" the parser into `new Date(value)` — which works
 * in Chrome, treats the value as local time, and returns `Invalid Date` in
 * Safari.
 */
describe('DateTime.toDate', () => {
  it('renders the API’s format for a reader', () => {
    expect(DateTime.toDate('2026-02-28 20:11:48')).toBe('28 Feb 2026')
  })

  it('drops the leading zero from a day, but not the year', () => {
    expect(DateTime.toDate('2026-01-05 00:00:00')).toBe('5 Jan 2026')
  })

  it('reads every month, including the last', () => {
    expect(DateTime.toDate('2026-12-31 23:59:59')).toBe('31 Dec 2026')
  })

  it('returns anything it does not recognise unchanged', () => {
    // Whatever the API sent is more use to whoever has to explain it than the
    // word "Invalid" would be.
    expect(DateTime.toDate('2026-02-28T20:11:48Z')).toBe('2026-02-28T20:11:48Z')
    expect(DateTime.toDate('')).toBe('')
  })

  it('refuses a month outside the calendar rather than inventing one', () => {
    expect(DateTime.toDate('2026-13-01 00:00:00')).toBe('2026-13-01 00:00:00')
    expect(DateTime.toDate('2026-00-01 00:00:00')).toBe('2026-00-01 00:00:00')
  })
})
