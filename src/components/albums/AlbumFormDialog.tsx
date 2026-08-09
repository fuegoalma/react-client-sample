import { FormAlert, FormField, FormModal, fieldClass } from '@/components/ui'
import { albumSchema, type AlbumValues } from '@/forms'
import { useApiForm } from '@/hooks'
import { useCreateAlbumMutation, useUpdateAlbumMutation } from '@/repositories'

export interface AlbumSummary {
  readonly id: number
  readonly title: string
}

interface AlbumFormDialogProps {
  readonly open: boolean
  /** Absent for a create; present for an edit. */
  readonly album?: AlbumSummary | undefined
  readonly onClose: () => void
}

/**
 * Create and edit share this one form: the album resource has a single editable
 * attribute, so two dialogs would be the same markup with a different verb.
 */
export function AlbumFormDialog({ open, album, onClose }: AlbumFormDialogProps) {
  if (!open) return null

  // Mounted only while open, so the form starts from the current album every
  // time instead of being reset by an effect.
  return <AlbumForm album={album} onClose={onClose} />
}

function AlbumForm({ album, onClose }: Omit<AlbumFormDialogProps, 'open'>) {
  const [createAlbum, { isLoading: isCreating }] = useCreateAlbumMutation()
  const [updateAlbum, { isLoading: isUpdating }] = useUpdateAlbumMutation()

  const isEdit = album !== undefined
  const {
    register,
    handleSubmit,
    submit,
    formState: { errors },
  } = useApiForm(albumSchema, { title: album?.title ?? '' })

  const onSubmit = (values: AlbumValues): Promise<void> =>
    submit(
      isEdit ? updateAlbum({ id: album.id, body: values }).unwrap() : createAlbum(values).unwrap(),
      {
        success: (saved) => (isEdit ? 'Album updated.' : `Album “${saved.title}” created.`),
        onDone: onClose,
      },
    )

  return (
    <FormModal
      title={isEdit ? 'Rename album' : 'New album'}
      submitLabel={isEdit ? 'Save' : 'Create album'}
      isBusy={isCreating || isUpdating}
      onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      onClose={onClose}
    >
      <FormAlert error={errors.root} />
      <FormField id="album-title" label="Title" error={errors.title}>
        <input
          id="album-title"
          className={fieldClass(errors.title)}
          maxLength={255}
          {...register('title')}
        />
      </FormField>
    </FormModal>
  )
}
