/**
 * The API's timestamps, rendered for a reader.
 *
 * They arrive as `Y-m-d H:i:s` — `"2026-02-28 20:11:48"` — which is **not**
 * ISO-8601: no `T`, no offset, no zone. Handing that string to `new Date()` is
 * the obvious mistake and a browser-dependent one: some parse it as local time,
 * Safari has historically returned `Invalid Date`. So it is parsed by hand.
 *
 * There is no zone to convert *from*, either. The API states a wall clock and
 * says nothing about where that clock is, so treating it as UTC and shifting it
 * into the reader's zone would move an event by hours on no evidence. The
 * values are shown as sent.
 */
const TIMESTAMP = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export const DateTime = {
  /**
   * `"2026-02-28 20:11:48"` → `"28 Feb 2026"`.
   *
   * An unrecognised value is returned unchanged rather than replaced with a
   * placeholder: whatever the API sent is more use to whoever has to explain it
   * than the word "Invalid" would be.
   */
  toDate(value: string): string {
    const parts = TIMESTAMP.exec(value)
    if (parts === null) return value

    const [, year, month, day] = parts
    const name = MONTHS[Number(month) - 1]
    if (name === undefined) return value

    return `${String(Number(day))} ${name} ${String(year)}`
  },
}
