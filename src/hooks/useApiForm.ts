import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback } from 'react'
import {
  useForm,
  type DefaultValues,
  type FieldValues,
  type Path,
  type UseFormReturn,
} from 'react-hook-form'
import type { z } from 'zod'

import { isApiError } from '@/api'

/**
 * Form state is typed by the schema's *input* (what the inputs hold), while
 * `handleSubmit` receives its *output* (what the API is sent) — that is what
 * lets a schema trim, coerce or default a value on the way through.
 */
export interface ApiFormReturn<
  TInput extends FieldValues,
  TValues extends FieldValues,
> extends UseFormReturn<TInput, unknown, TValues> {
  /**
   * Projects a failed request onto the form: 422 field errors land on their
   * inputs, anything else becomes a form-level message under `root`.
   */
  readonly applyApiError: (error: unknown) => void
}

/**
 * The bridge between a form request (a Zod schema) and the API's validation.
 *
 * Client-side rules mirror the server's, but the server owns checks the client
 * cannot make — email uniqueness, unknown permission names, the last-role-manager
 * invariant. This wires those answers back onto the right inputs, once, instead
 * of in every form.
 */
export function useApiForm<TInput extends FieldValues, TValues extends FieldValues = TInput>(
  schema: z.ZodType<TValues, TInput>,
  defaultValues: DefaultValues<TInput>,
  /**
   * Values to adopt once they arrive, for a form whose subject is loaded
   * asynchronously. This is `useForm`'s own mechanism for that — the
   * alternative, resetting inside an effect, re-renders on every refetch.
   */
  values?: Partial<TInput>,
): ApiFormReturn<TInput, TValues> {
  const form = useForm<TInput, unknown, TValues>({
    resolver: zodResolver(schema),
    defaultValues,
    ...(values !== undefined && { values: Object.assign({}, defaultValues, values) as TInput }),
    mode: 'onSubmit',
  })

  const { setError, getValues } = form

  const applyApiError = useCallback(
    (error: unknown): void => {
      if (!isApiError(error)) {
        setError('root', { message: 'An unexpected error occurred. Please try again.' })
        return
      }

      const known = new Set(Object.keys(getValues()))
      const orphaned: string[] = []
      let matched = false

      for (const [field, messages] of Object.entries(error.fieldErrors)) {
        const message = messages.join(' ')
        if (known.has(field)) {
          setError(field as Path<TInput>, { message })
          matched = true
        } else {
          // A field the API validates but this form does not render.
          orphaned.push(message)
        }
      }

      if (orphaned.length > 0 || !matched) {
        setError('root', { message: orphaned.join(' ') || error.message })
      }
    },
    [setError, getValues],
  )

  return Object.assign(form, { applyApiError })
}
