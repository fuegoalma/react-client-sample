import { describe, expect, it } from 'vitest'

import {
  albumSchema,
  hasAllowedImageExtension,
  loginSchema,
  PASSWORD_MISMATCH,
  photoUploadSchema,
  registerSchema,
  roleCreateSchema,
  toUserPayload,
  userCreateSchema,
  userUpdateSchema,
  withoutEmpty,
} from '@/forms'

/**
 * The client's form requests. They exist to reject client-side what the server
 * would reject anyway — so where they disagree with the API, the user gets a
 * round trip and a 422 instead of an instant message.
 */
describe('loginSchema', () => {
  it('accepts a well-formed credential pair', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', password: 'secret123' }).success).toBe(true)
  })

  it('rejects a malformed email', () => {
    expect(loginSchema.safeParse({ email: 'not-an-email', password: 'x' }).success).toBe(false)
  })

  it('does not impose a length rule on the login password', () => {
    // An existing account may predate the current minimum; only register enforces it.
    expect(loginSchema.safeParse({ email: 'a@b.com', password: 'x' }).success).toBe(true)
  })

  it('trims surrounding whitespace off the email', () => {
    const result = loginSchema.safeParse({ email: '  a@b.com ', password: 'x' })
    expect(result.success && result.data.email).toBe('a@b.com')
  })
})

describe('registerSchema', () => {
  const valid = {
    first_name: 'Ada',
    last_name: 'Lovelace',
    email: 'ada@example.com',
    password: 'secret123',
    password_confirm: 'secret123',
  }

  it('accepts a complete registration', () => {
    expect(registerSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects a mistyped confirmation, and says so on that field', () => {
    // A masked field cannot be proof-read, so the pair is the only check that
    // catches a typo before it creates an unusable account.
    const result = registerSchema.safeParse({ ...valid, password_confirm: 'secret124' })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(['password_confirm'])
    expect(result.error?.issues[0]?.message).toBe(PASSWORD_MISMATCH)
  })

  it('requires the confirmation to be filled in at all', () => {
    expect(registerSchema.safeParse({ ...valid, password_confirm: '' }).success).toBe(false)
  })

  it('requires every field', () => {
    expect(registerSchema.safeParse({ ...valid, first_name: '' }).success).toBe(false)
    expect(registerSchema.safeParse({ ...valid, last_name: '  ' }).success).toBe(false)
  })

  it('enforces the API’s six-character minimum', () => {
    expect(registerSchema.safeParse({ ...valid, password: 'short' }).success).toBe(false)
  })

  it('enforces bcrypt’s 72-character ceiling', () => {
    expect(registerSchema.safeParse({ ...valid, password: 'x'.repeat(73) }).success).toBe(false)
  })

  it('enforces the 255-character column limit on names', () => {
    expect(registerSchema.safeParse({ ...valid, first_name: 'x'.repeat(256) }).success).toBe(false)
  })
})

describe('userCreateSchema', () => {
  const valid = {
    first_name: 'Alan',
    last_name: 'Turing',
    email: 'alan@example.com',
    password: 'secret123',
    password_confirm: 'secret123',
  }

  it('accepts a matching pair', () => {
    expect(userCreateSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects a mismatch on the confirmation field', () => {
    const result = userCreateSchema.safeParse({ ...valid, password_confirm: 'nope' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(['password_confirm'])
  })
})

/**
 * `change_password` is the only switch. While it is off the password fields are
 * inert — whatever they contain, they neither fail validation nor reach the API.
 */
describe('userUpdateSchema', () => {
  const blank = {
    first_name: '',
    last_name: '',
    email: '',
    change_password: false,
    password: '',
    password_confirm: '',
  }

  it('accepts an entirely empty partial update', () => {
    expect(userUpdateSchema.safeParse(blank).success).toBe(true)
  })

  it('still validates a non-password field the user did fill in', () => {
    expect(userUpdateSchema.safeParse({ ...blank, email: 'nope' }).success).toBe(false)
  })

  describe('with the checkbox off', () => {
    it('ignores a password that would otherwise be too short', () => {
      expect(
        userUpdateSchema.safeParse({ ...blank, password: 'x', password_confirm: 'x' }).success,
      ).toBe(true)
    })

    it('ignores two passwords that do not match at all', () => {
      // Left behind by a browser autofill, say — it must not block the form.
      const result = userUpdateSchema.safeParse({
        ...blank,
        password: 'secret123',
        password_confirm: 'something-else',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('with the checkbox on', () => {
    const changing = { ...blank, change_password: true }

    it('accepts a valid, matching pair', () => {
      expect(
        userUpdateSchema.safeParse({
          ...changing,
          password: 'secret123',
          password_confirm: 'secret123',
        }).success,
      ).toBe(true)
    })

    it('enforces the minimum length', () => {
      const result = userUpdateSchema.safeParse({
        ...changing,
        password: 'short',
        password_confirm: 'short',
      })
      expect(result.success).toBe(false)
      expect(result.error?.issues.some((issue) => issue.path[0] === 'password')).toBe(true)
    })

    it('enforces the match', () => {
      const result = userUpdateSchema.safeParse({
        ...changing,
        password: 'secret123',
        password_confirm: 'secret124',
      })
      expect(result.success).toBe(false)
      expect(result.error?.issues.some((issue) => issue.path[0] === 'password_confirm')).toBe(true)
    })
  })
})

describe('toUserPayload', () => {
  it('sends only the fields the user filled in', () => {
    expect(toUserPayload({ first_name: 'Ada', last_name: '', email: undefined })).toEqual({
      first_name: 'Ada',
    })
  })

  it('never sends a password while the checkbox is off, however full the fields', () => {
    expect(
      toUserPayload({
        first_name: 'Ada',
        change_password: false,
        password: 'secret123',
        password_confirm: 'secret123',
      }),
    ).toEqual({ first_name: 'Ada' })
  })

  it('sends the password once the change was asked for', () => {
    expect(
      toUserPayload({
        change_password: true,
        password: 'secret123',
        password_confirm: 'secret123',
      }),
    ).toEqual({ password: 'secret123' })
  })

  it('never leaks the fields that are form state rather than attributes', () => {
    const payload = toUserPayload({
      email: 'ada@example.com',
      change_password: true,
      password: 'secret123',
      password_confirm: 'secret123',
    })

    expect(Object.keys(payload).sort()).toEqual(['email', 'password'])
  })
})

describe('albumSchema', () => {
  it('requires a title', () => {
    expect(albumSchema.safeParse({ title: '' }).success).toBe(false)
    expect(albumSchema.safeParse({ title: '   ' }).success).toBe(false)
    expect(albumSchema.safeParse({ title: 'Vacation' }).success).toBe(true)
  })
})

describe('photoUploadSchema', () => {
  const file = (name: string, size = 10) =>
    new File([new Uint8Array(size)], name, { type: 'image/png' })

  it('accepts every extension the API allows', () => {
    for (const extension of ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif']) {
      expect(
        photoUploadSchema.safeParse({ title: 'x', file: file(`a.${extension}`) }).success,
      ).toBe(true)
    }
  })

  it('rejects an extension the API would refuse', () => {
    expect(photoUploadSchema.safeParse({ title: 'x', file: file('a.pdf') }).success).toBe(false)
  })

  it('rejects an empty file', () => {
    expect(photoUploadSchema.safeParse({ title: 'x', file: file('a.png', 0) }).success).toBe(false)
  })

  it('requires a file at all', () => {
    expect(photoUploadSchema.safeParse({ title: 'x', file: undefined }).success).toBe(false)
  })

  it('is case-insensitive about the extension', () => {
    expect(hasAllowedImageExtension('PHOTO.JPEG')).toBe(true)
    expect(hasAllowedImageExtension('photo')).toBe(false)
  })
})

describe('roleCreateSchema', () => {
  it('accepts a composed role', () => {
    const result = roleCreateSchema.safeParse({
      name: 'editor',
      description: 'Can edit any album',
    })
    expect(result.success).toBe(true)
  })

  it('accepts a role with no description', () => {
    // The permission set is not a form field — it is edited as a selection.
    expect(roleCreateSchema.safeParse({ name: 'editor' }).success).toBe(true)
  })

  it('rejects a name the API would not accept', () => {
    expect(roleCreateSchema.safeParse({ name: 'Editor Role' }).success).toBe(false)
    expect(roleCreateSchema.safeParse({ name: 'x'.repeat(65) }).success).toBe(false)
  })
})

describe('withoutEmpty', () => {
  it('keeps only the fields the user actually filled in', () => {
    // The API applies a partial update, so a blank would otherwise overwrite.
    expect(withoutEmpty({ first_name: 'Ada', last_name: '', email: undefined })).toEqual({
      first_name: 'Ada',
    })
  })

  it('preserves falsy values that are not empty', () => {
    expect(withoutEmpty({ count: 0, flag: false })).toEqual({ count: 0, flag: false })
  })
})

describe('toUserPayload', () => {
  it('sends only the attributes the API knows', () => {
    expect(
      toUserPayload({
        first_name: 'Ada',
        last_name: '',
        email: 'ada@example.com',
        change_password: false,
        password: 'secret123',
        password_confirm: 'secret123',
      }),
    ).toEqual({ first_name: 'Ada', email: 'ada@example.com' })
  })

  it('sends the password only when the change was asked for', () => {
    expect(
      toUserPayload({
        change_password: true,
        password: 'secret123',
        password_confirm: 'secret123',
      }),
    ).toEqual({ password: 'secret123' })
  })

  it('sends no password when the flag is on but nothing was typed', () => {
    // The flag alone must not blank an account's password.
    expect(toUserPayload({ change_password: true })).toEqual({})
    expect(toUserPayload({ change_password: true, password: '' })).toEqual({})
  })
})
