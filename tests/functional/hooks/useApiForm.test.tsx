import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { FormAlert, FormField, SubmitButton, fieldClass } from '@/components'
import { useApiForm } from '@/hooks'
import type { ApiError } from '@/types'

import { renderWithProviders } from '../../utils/renderWithProviders'

const schema = z.object({ title: z.string().min(1, 'Title is required.') })

/**
 * A form reduced to what `useApiForm` actually bridges: a schema, one input, and
 * whatever the API answered. The pages exercise the happy paths; this covers the
 * answers a page cannot easily provoke.
 */
function TestForm({ error }: { readonly error: unknown }) {
  const {
    register,
    handleSubmit,
    applyApiError,
    formState: { errors },
  } = useApiForm(schema, { title: '' })

  return (
    <form
      onSubmit={(event) =>
        void handleSubmit(() => {
          applyApiError(error)
        })(event)
      }
      noValidate
    >
      <FormAlert error={errors.root} />
      <FormField id="title" label="Title" error={errors.title}>
        <input id="title" className={fieldClass(errors.title)} {...register('title')} />
      </FormField>
      <SubmitButton isBusy={false} label="Save" />
    </form>
  )
}

function apiError(fieldErrors: ApiError['fieldErrors'], message = 'Please correct the fields.') {
  return { code: 422, message, fieldErrors } satisfies ApiError
}

describe('useApiForm', () => {
  it('validates against the schema before anything is sent', async () => {
    const { user } = renderWithProviders(<TestForm error={apiError({})} />)

    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Title is required.')).toBeInTheDocument()
  })

  it('puts a field error on the input it belongs to', async () => {
    const { user } = renderWithProviders(
      <TestForm error={apiError({ title: ['Title has already been taken.'] })} />,
    )

    await user.type(screen.getByLabelText('Title'), 'Vacation')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Title has already been taken.')).toBeInTheDocument()
  })

  it('joins several messages for the same field', async () => {
    const { user } = renderWithProviders(
      <TestForm error={apiError({ title: ['Too short.', 'Must be unique.'] })} />,
    )

    await user.type(screen.getByLabelText('Title'), 'V')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Too short. Must be unique.')).toBeInTheDocument()
  })

  it('raises a field this form does not render to the form level', async () => {
    const { user } = renderWithProviders(
      <TestForm error={apiError({ user_id: ['This account may not own more albums.'] })} />,
    )

    await user.type(screen.getByLabelText('Title'), 'Vacation')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This account may not own more albums.',
    )
  })

  it('falls back to the API’s message when it named no field at all', async () => {
    const { user } = renderWithProviders(
      <TestForm error={apiError({}, 'This operation conflicts with a safety rule.')} />,
    )

    await user.type(screen.getByLabelText('Title'), 'Vacation')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This operation conflicts with a safety rule.',
    )
  })

  it('never leaves the user without an explanation for something it cannot read', async () => {
    // A thrown value that never went through the error normaliser at all.
    const { user } = renderWithProviders(<TestForm error={new Error('boom')} />)

    await user.type(screen.getByLabelText('Title'), 'Vacation')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'An unexpected error occurred. Please try again.',
    )
  })
})
