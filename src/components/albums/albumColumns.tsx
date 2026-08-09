import { Link } from 'react-router-dom'

import type { Column } from '@/components/ui'
import type { Album } from '@/types'

/**
 * What both album lists say about an album before their audiences diverge.
 *
 * "My albums" and "All albums" answer different questions — one shows the
 * caller's own, the other everyone's, with deletion state and a restore for
 * whoever may act on it — but they name and address an album identically, and
 * had said so twice.
 */
export const ALBUM_BASE_COLUMNS: readonly Column<Album>[] = [
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
]
