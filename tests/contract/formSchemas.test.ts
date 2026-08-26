import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { parse } from 'yaml'
import { describe, expect, it } from 'vitest'
import type { ZodType } from 'zod'

import {
  albumSchema,
  ALLOWED_IMAGE_EXTENSIONS,
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  MAX_UPLOAD_BYTES,
  photoUpdateSchema,
  photoUploadSchema,
  registerSchema,
  resetPasswordSchema,
  roleCreateSchema,
  userCreateSchema,
  userUpdateSchema,
  verifyEmailSchema,
} from '@/forms'

interface Property {
  readonly type?: string
  readonly format?: string
  readonly minLength?: number
  readonly maxLength?: number
}

interface RequestSchema {
  readonly required?: readonly string[]
  readonly properties: Record<string, Property>
}

interface Operation {
  readonly description?: string
  readonly requestBody?: { readonly content: Record<string, { readonly schema: RequestSchema }> }
}

interface Spec {
  readonly paths: Record<string, Record<string, Operation>>
  readonly components: { readonly schemas: Record<string, RequestSchema> }
}

const spec = parse(readFileSync(join(import.meta.dirname, 'openapi.yaml'), 'utf8')) as Spec

/** The one `multipart/form-data` operation, whose body the document inlines. */
const PHOTO_UPLOAD = spec.paths['/albums/{albumId}/photos']?.['post']
const photoUploadBody = PHOTO_UPLOAD?.requestBody?.content['multipart/form-data']?.schema

interface FormUnderTest {
  /** `.shape` survives `.refine`/`.superRefine`, so a refined object still works. */
  readonly form: { readonly shape: Record<string, ZodType> }
  readonly body: RequestSchema | undefined
  /** Form state that is never a request attribute. */
  readonly clientOnly?: readonly string[]
  /** Attributes the endpoint accepts that this form deliberately does not ask for. */
  readonly notAsked?: readonly string[]
  /** Fields whose limits live somewhere other than the field's own rule. */
  readonly limitsElsewhere?: readonly string[]
}

/**
 * The client's form requests, against the request bodies they are transcribed
 * from. `src/forms/rules.ts` mirrors the API's validators by hand — the point
 * of this file is that "by hand" stops meaning "unchecked".
 *
 * `tests/contract/listSpecs.test.ts` does the same for the search forms.
 */
const FORMS: Readonly<Record<string, FormUnderTest>> = {
  login: {
    form: loginSchema,
    body: spec.components.schemas['LoginRequest'],
    // An existing account's password is whatever it already is, and a wrong one
    // is a 401 rather than a 422 — so the sign-in form does not cap its length.
    limitsElsewhere: ['password'],
  },
  register: {
    form: registerSchema,
    body: spec.components.schemas['RegisterRequest'],
    clientOnly: ['password_confirm'],
  },
  'forgot password': {
    form: forgotPasswordSchema,
    body: spec.components.schemas['ForgotPasswordRequest'],
  },
  'reset password': {
    form: resetPasswordSchema,
    body: spec.components.schemas['ResetPasswordRequest'],
    clientOnly: ['password_confirm'],
  },
  'verify email': {
    form: verifyEmailSchema,
    body: spec.components.schemas['VerifyEmailRequest'],
  },
  'change password': {
    form: changePasswordSchema,
    body: spec.components.schemas['ChangePasswordRequest'],
    clientOnly: ['password_confirm'],
    // The current password is checked against what is stored, not proposed, so
    // the form does not hold it to the length rules a new one must meet.
    limitsElsewhere: ['current_password'],
  },
  'user create': {
    form: userCreateSchema,
    body: spec.components.schemas['UserCreateRequest'],
    clientOnly: ['password_confirm'],
  },
  'user update': {
    form: userUpdateSchema,
    body: spec.components.schemas['UserUpdateRequest'],
    clientOnly: ['password_confirm', 'change_password'],
    // The password field is deliberately permissive on its own: `change_password`
    // is the only switch, and the rule is applied inside `superRefine` when it is
    // on. `passwordRule` itself is covered through the two create forms.
    limitsElsewhere: ['password'],
  },
  album: {
    form: albumSchema,
    body: spec.components.schemas['AlbumCreateRequest'],
  },
  'photo upload': {
    form: photoUploadSchema,
    body: photoUploadBody,
    // Not a text field: its own rules are the extension list asserted below.
    limitsElsewhere: ['file'],
  },
  'photo update': {
    form: photoUpdateSchema,
    body: spec.components.schemas['PhotoUpdateRequest'],
  },
  role: {
    form: roleCreateSchema,
    body: spec.components.schemas['RoleCreateRequest'],
    // A role's permission set is edited as a selection, not a form control —
    // `useToggleSelection` owns it, and it is sent alongside these attributes.
    notAsked: ['permissions'],
  },
}

/**
 * A string of exactly `length` characters that is otherwise valid, so a boundary
 * case can only fail on its length. An email of 255 `a`s is not an email.
 */
function stringOfLength(length: number, format?: string): string {
  if (format !== 'email') return 'a'.repeat(length)

  const domain = '@example.com'
  return `${'a'.repeat(Math.max(length - domain.length, 1))}${domain}`
}

describe.each(Object.entries(FORMS))('The %s form', (_name, entry) => {
  const { form, body, clientOnly = [], notAsked = [], limitsElsewhere = [] } = entry

  it('asks for exactly the attributes the endpoint accepts', () => {
    const asked = Object.keys(form.shape)
      .filter((field) => !clientOnly.includes(field))
      .sort()

    expect(asked).toEqual(
      Object.keys(body?.properties ?? {})
        .filter((field) => !notAsked.includes(field))
        .sort(),
    )
  })

  it('rejects what the endpoint would reject on length', () => {
    const checked = Object.entries(body?.properties ?? {}).filter(
      ([field]) => field in form.shape && !limitsElsewhere.includes(field),
    )

    for (const [field, property] of checked) {
      const rule = form.shape[field]
      const { minLength, maxLength, format } = property

      if (maxLength !== undefined) {
        expect(rule?.safeParse(stringOfLength(maxLength, format)).success, `${field} at max`).toBe(
          true,
        )
        expect(
          rule?.safeParse(stringOfLength(maxLength + 1, format)).success,
          `${field} past max`,
        ).toBe(false)
      }

      if (minLength !== undefined) {
        expect(rule?.safeParse(stringOfLength(minLength, format)).success, `${field} at min`).toBe(
          true,
        )
        expect(
          rule?.safeParse(stringOfLength(minLength - 1, format)).success,
          `${field} below min`,
        ).toBe(false)
      }
    }

    // Guards the loop above: a mapping that resolved to nothing would pass it.
    expect(checked.length).toBeGreaterThan(0)
  })
})

describe('The upload form accepts the extensions the endpoint documents', () => {
  it('reads them from the operation that states them', () => {
    // The document carries the list in prose, the same way it carries each
    // resource's sortable attributes — see `listSpecs.test.ts`.
    const documented = /Allowed extensions:\s*`([^`]+)`/.exec(PHOTO_UPLOAD?.description ?? '')

    expect(documented?.[1]?.split(',').map((extension) => extension.trim())).toEqual([
      ...ALLOWED_IMAGE_EXTENSIONS,
    ])
  })

  it('refuses a file at the size the endpoint states, and no other', () => {
    // Stated in prose too. Left to a literal in `rules.ts`, the limit would
    // simply stop matching the day the API raised it, and the only symptom
    // would be uploads the server rejects after the wait.
    const documented = /at most (\d+) bytes/.exec(PHOTO_UPLOAD?.description ?? '')

    expect(Number(documented?.[1])).toBe(MAX_UPLOAD_BYTES)
  })
})
