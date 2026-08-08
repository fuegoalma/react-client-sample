import { z } from 'zod'

import {
  descriptionRule,
  emailRule,
  hasAllowedImageExtension,
  nameRule,
  optionalText,
  PASSWORD_MISMATCH,
  PASSWORD_MISMATCH_ISSUE,
  passwordPairShape,
  passwordRule,
  passwordsMatch,
  roleNameRule,
  titleRule,
} from './rules'

/* -- Auth ------------------------------------------------------------------ */

export const loginSchema = z.object({
  email: emailRule,
  password: z.string().min(1, 'Password is required.'),
})
export type LoginValues = z.infer<typeof loginSchema>

export const registerSchema = z
  .object({
    first_name: nameRule,
    last_name: nameRule,
    email: emailRule,
    ...passwordPairShape,
  })
  .refine(passwordsMatch, PASSWORD_MISMATCH_ISSUE)
export type RegisterValues = z.infer<typeof registerSchema>

/* -- Users ----------------------------------------------------------------- */

export const userCreateSchema = z
  .object({
    first_name: nameRule,
    last_name: nameRule,
    email: emailRule,
    ...passwordPairShape,
  })
  .refine(passwordsMatch, PASSWORD_MISMATCH_ISSUE)
export type UserCreateValues = z.infer<typeof userCreateSchema>

/**
 * A partial update, exactly like `UserUpdateForm` — plus an explicit opt-in for
 * the password.
 *
 * `change_password` is the *only* switch: while it is off the two password
 * fields are neither validated nor sent, whatever they happen to contain. That
 * is what makes a value left behind by a browser's autofill harmless — it can
 * neither block the form nor quietly change the account's password.
 */
export const userUpdateSchema = z
  .object({
    first_name: optionalText(nameRule),
    last_name: optionalText(nameRule),
    email: optionalText(emailRule),
    change_password: z.boolean().default(false),
    password: z.string().default(''),
    password_confirm: z.string().default(''),
  })
  .superRefine((values, ctx) => {
    if (!values.change_password) return

    const password = passwordRule.safeParse(values.password)
    if (!password.success) {
      ctx.addIssue({
        code: 'custom',
        path: ['password'],
        // A rejected parse always carries at least one issue; the fallback only
        // exists because an indexed access cannot be typed to say so.
        /* v8 ignore next */
        message: password.error.issues[0]?.message ?? 'Enter a valid password.',
      })
    }

    if (!passwordsMatch(values)) {
      ctx.addIssue({ code: 'custom', path: ['password_confirm'], message: PASSWORD_MISMATCH })
    }
  })
export type UserUpdateValues = z.infer<typeof userUpdateSchema>

/* -- Albums ---------------------------------------------------------------- */

export const albumSchema = z.object({ title: titleRule })
export type AlbumValues = z.infer<typeof albumSchema>

/* -- Photos ---------------------------------------------------------------- */

export const photoUploadSchema = z.object({
  title: titleRule,
  file: z
    .instanceof(File, { message: 'Choose an image to upload.' })
    .refine((file) => file.size > 0, 'Choose an image to upload.')
    .refine(
      (file) => hasAllowedImageExtension(file.name),
      'Allowed formats: jpg, jpeg, png, webp, gif, avif.',
    ),
})
export type PhotoUploadValues = z.infer<typeof photoUploadSchema>

/** The album and the stored file are immutable — only the title may change. */
export const photoUpdateSchema = z.object({ title: titleRule })
export type PhotoUpdateValues = z.infer<typeof photoUpdateSchema>

/* -- Roles ----------------------------------------------------------------- */

/**
 * Only the role's own attributes. Its permission set is edited as a selection
 * rather than a form control, so it is not a field here.
 */
export const roleCreateSchema = z.object({
  name: roleNameRule,
  description: optionalText(descriptionRule),
})
export type RoleCreateValues = z.infer<typeof roleCreateSchema>
