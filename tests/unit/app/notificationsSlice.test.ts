import { describe, expect, it } from 'vitest'

import {
  dismissed,
  notificationsSlice,
  notified,
  notifyError,
  notifySuccess,
  selectNotifications,
} from '@/app/notificationsSlice'

const reducer = notificationsSlice.reducer

describe('notificationsSlice', () => {
  it('starts with nothing to show', () => {
    expect(reducer(undefined, { type: '@@init' })).toEqual({ items: [] })
  })

  it('stacks notifications in the order they were raised', () => {
    const first = reducer(undefined, notified('success', 'Saved.'))
    const second = reducer(first, notified('danger', 'Refused.'))

    expect(second.items.map((item) => item.message)).toEqual(['Saved.', 'Refused.'])
    expect(second.items.map((item) => item.variant)).toEqual(['success', 'danger'])
  })

  it('gives every notification its own identity, so duplicates both appear', () => {
    const first = reducer(undefined, notified('success', 'Saved.'))
    const second = reducer(first, notified('success', 'Saved.'))

    const [one, two] = second.items
    expect(second.items).toHaveLength(2)
    expect(one?.id).not.toBe(two?.id)
  })

  it('dismisses one notification without disturbing the rest', () => {
    const state = reducer(
      reducer(undefined, notified('success', 'Saved.')),
      notified('danger', 'Refused.'),
    )
    const target = state.items[0]

    expect(target).toBeDefined()
    const remaining = reducer(state, dismissed(target?.id ?? ''))

    expect(remaining.items.map((item) => item.message)).toEqual(['Refused.'])
  })

  it('ignores a dismissal of something already gone', () => {
    const state = reducer(undefined, notified('success', 'Saved.'))
    expect(reducer(state, dismissed('no-such-id')).items).toHaveLength(1)
  })

  it('exposes the stack to any layer that renders it', () => {
    const state = reducer(undefined, notified('success', 'Saved.'))
    expect(selectNotifications({ notifications: state })).toBe(state.items)
  })

  describe('the shorthands any layer can dispatch', () => {
    it('raises a success toast', () => {
      expect(reducer(undefined, notifySuccess('Done.')).items[0]).toMatchObject({
        variant: 'success',
        message: 'Done.',
      })
    })

    it('raises an error toast — the transport uses this on a failed refresh', () => {
      expect(reducer(undefined, notifyError('Session expired.')).items[0]).toMatchObject({
        variant: 'danger',
        message: 'Session expired.',
      })
    })
  })
})
