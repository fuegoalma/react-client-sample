import { z } from 'zod'

import {
  descriptionRule,
  emailRule,
  hasAllowedImageExtension,
  MAX_UPLOAD_BYTES,
  nameRule,
  optionalText,
  PASSWORD_MISMATCH,
  PASSWORD_MISMATCH_ISSUE,
  passwordPairShape,
  passwordRule,
  passwordsMatch,
  roleNameRule,
  titleRule,
  tokenRule,
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

/**
 * Asking for an address is all this form does. The API answers 204 whether or
 * not the address is registered, so there is nothing to validate against and
 * nothing the reply may reveal.
 */
export const forgotPasswordSchema = z.object({ email: emailRule })
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>

/** The token comes from the email; the pair is confirmed as on every other password form. */
export const resetPasswordSchema = z
  .object({ token: tokenRule, ...passwordPairShape })
  .refine(passwordsMatch, PASSWORD_MISMATCH_ISSUE)
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>

export const verifyEmailSchema = z.object({ token: tokenRule })
export type VerifyEmailValues = z.infer<typeof verifyEmailSchema>

/* -- Users ----------------------------------------------------------------- */

/**
 * Changing one's own password. The current one is asked for because the API
 * requires it: a bearer token left on a shared machine should not be enough to
 * take the account over.
 *
 * `min(1)` rather than `passwordRule` on the current password — it is being
 * checked against what is stored, not proposed, and holding it to today's rules
 * would lock out an account whose password predates them.
 */
export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, 'Your current password is required.'),
    ...passwordPairShape,
  })
  .refine(passwordsMatch, PASSWORD_MISMATCH_ISSUE)
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>

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
    )
    .refine((file) => file.size <= MAX_UPLOAD_BYTES, 'That file is larger than 10 MB.'),
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
