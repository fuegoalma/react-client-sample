import { useEffect, useState } from 'react'
import { Controller } from 'react-hook-form'

import { FormAlert, FormField, FormModal, fieldClass } from '@/components/ui'
import { ALLOWED_IMAGE_EXTENSIONS, photoUploadSchema, type PhotoUploadValues } from '@/forms'
import { useApiForm } from '@/hooks'
import { useUploadPhotoMutation } from '@/repositories'

interface PhotoUploadDialogProps {
  readonly open: boolean
  readonly albumId: number
  readonly onClose: () => void
}

const ACCEPT = ALLOWED_IMAGE_EXTENSIONS.map((extension) => `.${extension}`).join(',')

/**
 * The API's only multipart endpoint. The extension whitelist is enforced here
 * as well as server-side so an obviously wrong file is rejected before it is
 * uploaded — the server still has the final say, since it validates the actual
 * image content, not the name.
 */
export function PhotoUploadDialog({ open, albumId, onClose }: PhotoUploadDialogProps) {
  if (!open) return null

  // Mounted only while open, so each upload starts from an empty form.
  return <UploadForm albumId={albumId} onClose={onClose} />
}

function UploadForm({ albumId, onClose }: Omit<PhotoUploadDialogProps, 'open'>) {
  const [uploadPhoto, { isLoading }] = useUploadPhotoMutation()
  const [preview, setPreview] = useState<string | null>(null)

  const {
    register,
    control,
    handleSubmit,
    submit,
    formState: { errors },
  } = useApiForm(photoUploadSchema, { title: '', file: undefined })

  // Object URLs are a resource: release the previous one whenever it changes.
  useEffect(() => {
    if (preview === null) return undefined
    return () => {
      URL.revokeObjectURL(preview)
    }
  }, [preview])

  const onSubmit = (values: PhotoUploadValues): Promise<void> =>
    submit(uploadPhoto({ albumId, title: values.title, file: values.file }).unwrap(), {
      success: (uploaded) => `“${uploaded.title}” was uploaded.`,
      onDone: onClose,
    })

  return (
    <FormModal
      title="Upload a photo"
      submitLabel="Upload"
      busyLabel="Uploading…"
      isBusy={isLoading}
      onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      onClose={onClose}
    >
      <FormAlert error={errors.root} />

      <FormField id="photo-title" label="Title" error={errors.title}>
        <input
          id="photo-title"
          className={fieldClass(errors.title)}
          maxLength={255}
          {...register('title')}
        />
      </FormField>

      <FormField
        id="photo-file"
        label="Image"
        error={errors.file}
        hint="Converted to WebP and scaled to fit 500×500 by the API."
      >
        <Controller
          control={control}
          name="file"
          render={({ field }) => (
            <input
              id="photo-file"
              type="file"
              accept={ACCEPT}
              className={fieldClass(errors.file)}
              onChange={(event) => {
                const file = event.target.files?.[0]
                field.onChange(file)
                setPreview(file === undefined ? null : URL.createObjectURL(file))
              }}
            />
          )}
        />
      </FormField>

      {preview !== null && (
        <div className="uploadPreview">
          <img className="uploadPreview__thumb" src={preview} alt="" />
          <span className="small text-secondary">Preview of the selected file.</span>
        </div>
      )}
    </FormModal>
  )
}
