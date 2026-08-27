import { z } from 'zod'

/**
 * The primitives every form request is built from. They mirror the API's own
 * validators (`models/form/`), so the client rejects what the server would
 * reject — one definition per rule rather than one per form.
 */

/** Yii's `string` validator trims; matching that avoids "required" surprises. */
const trimmed = z.string().trim()

export const nameRule = trimmed
  .min(1, 'This field is required.')
  .max(255, 'Maximum 255 characters.')

/** 254, not 255: RFC 5321 caps a deliverable address there, and the API follows it. */
export const emailRule = trimmed
  .min(1, 'Email is required.')
  .max(254, 'Maximum 254 characters.')
  .pipe(z.email('Enter a valid email address.'))

/** bcrypt truncates beyond 72 bytes, which is why the API caps it there. */
export const passwordRule = z
  .string()
  .min(6, 'Password must be at least 6 characters.')
  .max(72, 'Maximum 72 characters.')

export const titleRule = trimmed.min(1, 'Title is required.').max(255, 'Maximum 255 characters.')

/**
 * A single-use token from a password-reset or email-verification message.
 *
 * The API mails the token on its own rather than inside a link, so it is
 * something a person copies out of their inbox — trimmed, because a copied
 * line usually brings whitespace with it.
 */
export const tokenRule = trimmed
  .min(1, 'Paste the token from the email.')
  .max(64, 'Maximum 64 characters.')

export const roleNameRule = trimmed
  .min(1, 'Name is required.')
  .max(64, 'Maximum 64 characters.')
  .regex(/^[a-z0-9_-]+$/, 'Use lowercase letters, digits, underscores and hyphens only.')

export const descriptionRule = trimmed.max(255, 'Maximum 255 characters.')

/**
 * Optional in the "partial update" sense: an untouched field is omitted from
 * the request entirely rather than sent as an empty string, because the API
 * only applies attributes that are actually present.
 */
export function optionalText<T extends z.ZodType<string>>(rule: T) {
  return z.union([z.literal(''), rule]).optional()
}

export const PASSWORD_MISMATCH = 'The two passwords do not match.'

/**
 * The password pair every account form asks for. A masked field cannot be
 * proof-read, so a single typo would otherwise create an account nobody can
 * sign in to.
 */
export const passwordPairShape = {
  password: passwordRule,
  password_confirm: z.string().min(1, 'Please repeat the password.'),
}

/** Reports a mismatch on the confirmation, where the user can act on it. */
export function passwordsMatch(values: {
  readonly password: string
  readonly password_confirm: string
}): boolean {
  return values.password === values.password_confirm
}

export const PASSWORD_MISMATCH_ISSUE = {
  message: PASSWORD_MISMATCH,
  path: ['password_confirm'],
}

/** Extensions the API accepts; anything else is rejected before upload. */
export const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'] as const

/**
 * The largest file the API stores, in bytes (10 MiB).
 *
 * Checking it here saves a pointless upload, and the two ways the API refuses
 * one are worth knowing apart: a file over this size is a 422 on the `file`
 * field, while a *body* over PHP's own limit never reaches the application at
 * all and comes back as a 413. Both are handled, but neither is a good
 * experience compared with saying so before the bytes leave.
 */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

export function hasAllowedImageExtension(fileName: string): boolean {
  // Indexing the split parts would leave a branch for "no last element" that a
  // non-empty split can never take; a name with no dot has no extension at all.
  const lastDot = fileName.lastIndexOf('.')
  const extension = lastDot === -1 ? '' : fileName.slice(lastDot + 1).toLowerCase()
  return (ALLOWED_IMAGE_EXTENSIONS as readonly string[]).includes(extension)
}

/**
 * Drops keys the user left untouched, so a partial update never overwrites a
 * field with an empty string. Mirrors the API's `validatedData()`.
 */
export function withoutEmpty<T extends Record<string, unknown>>(values: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== '' && value !== undefined),
  ) as Partial<T>
}

/** What an account-edit form holds, before it becomes a request body. */
interface UserUpdateFormValues {
  readonly first_name?: string | undefined
  readonly last_name?: string | undefined
  readonly email?: string | undefined
  readonly change_password?: boolean | undefined
  readonly password?: string | undefined
  readonly password_confirm?: string | undefined
}

/**
 * A blank account-edit form. It is both the initial state and what a successful
 * save resets to, in every form that edits an account — one literal so the two
 * cannot drift apart.
 */
export const EMPTY_USER_UPDATE_VALUES = {
  first_name: '',
  last_name: '',
  email: '',
  change_password: false,
  password: '',
  password_confirm: '',
} as const

/** The request body: only real attributes, only fields the user filled in. */
export interface UserUpdatePayload {
  first_name?: string
  last_name?: string
  email?: string
  password?: string
}

/**
 * Turns an account-edit form into the API's partial update.
 *
 * `change_password` gates the password on the way out exactly as it gates
 * validation on the way in — one flag read in both places, so the two can never
 * disagree and send an unvalidated password. `password_confirm` and the flag
 * itself are form state, never attributes, and never leave here.
 */
export function toUserPayload(values: UserUpdateFormValues): UserUpdatePayload {
  const payload: UserUpdatePayload = withoutEmpty({
    first_name: values.first_name,
    last_name: values.last_name,
    email: values.email,
  })

  if (values.change_password === true && (values.password ?? '') !== '') {
    payload.password = values.password
  }

  return payload
}
