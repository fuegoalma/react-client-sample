import { useState } from 'react'
import { Link } from 'react-router-dom'

import { AlbumDeleteDialog } from '@/components/albums/AlbumDeleteDialog'
import { AlbumFormDialog } from '@/components/albums/AlbumFormDialog'
import { ListScreen, PageHeader, type Column } from '@/components'
import { albumListSpec } from '@/forms'
import { useListQuery } from '@/hooks'
import { useMyAlbumsQuery, usePrefetchAlbum } from '@/repositories'
import type { Album } from '@/types'

/**
 * The caller's own albums — a base ability, so this screen needs no permission
 * at all. Soft-deleted albums are excluded by the API, which is why there is no
 * deletion state here.
 */
export function MyAlbumsPage() {
  const list = useListQuery(albumListSpec)
  const prefetchAlbum = usePrefetchAlbum()
  const { data, error, isLoading, isFetching } = useMyAlbumsQuery(list.query)

  const [editing, setEditing] = useState<Album | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<Album | null>(null)

  const columns: readonly Column<Album>[] = [
    {
      key: 'title',
      header: 'Title',
      sortAttribute: 'title',
      render: (album) => <Link to={`/albums/${album.id}`}>{album.title}</Link>,
    },
    {
      key: 'id',
      header: 'ID',
      sortAttribute: 'id',
      className: 'text-secondary',
      render: (album) => album.id,
    },
    {
      key: 'actions',
      header: <span className="visually-hidden">Actions</span>,
      className: 'text-end',
      render: (album) => (
        <div className="dataTable__actions">
          <Link className="btn btn-sm btn-outline-secondary" to={`/albums/${album.id}`}>
            Open
          </Link>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => {
              setEditing(album)
            }}
          >
            Rename
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            onClick={() => {
              setDeleting(album)
            }}
          >
            Delete
          </button>
        </div>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="My albums"
        subtitle="Albums you own. Every authenticated account can create one."
        actions={
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => {
              setCreating(true)
            }}
          >
            <i className="bi bi-plus-lg me-1" aria-hidden="true" />
            New album
          </button>
        }
      />

      <ListScreen
        list={list}
        result={{ data, error, isLoading, isFetching }}
        columns={columns}
        rowKey={(album) => album.id}
        caption="My albums"
        emptyMessage="You have not created an album yet."
        filteredEmptyMessage="No albums match this filter."
        onRowFocus={(album) => {
          prefetchAlbum(album.id)
        }}
      />

      <AlbumFormDialog
        open={creating}
        onClose={() => {
          setCreating(false)
        }}
      />
      <AlbumFormDialog
        open={editing !== null}
        album={editing ?? undefined}
        onClose={() => {
          setEditing(null)
        }}
      />
      <AlbumDeleteDialog
        album={deleting}
        // Every album here is the caller's own, and ownership always deletes
        // permanently — asking the policy could only ever get the same answer.
        mode="permanent"
        onClose={() => {
          setDeleting(null)
        }}
      />
    </>
  )
}
