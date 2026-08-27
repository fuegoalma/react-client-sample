import { useEffect, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'

import { paths } from '@/app/paths'
import { config } from '@/config'
import { useAuth, usePermissions, useTheme } from '@/hooks'
import { useMeQuery } from '@/repositories'
import { PERMISSIONS } from '@/services'

interface NavItem {
  readonly to: string
  readonly label: string
  /** Absent means every authenticated user sees it. */
  readonly permission?: string
}

const NAV_ITEMS: readonly NavItem[] = [
  { to: paths.myAlbums, label: 'My albums' },
  { to: paths.allAlbums, label: 'All albums', permission: PERMISSIONS.albumIndexAny },
  { to: paths.users, label: 'Users', permission: PERMISSIONS.userIndexAny },
  { to: paths.roles, label: 'Roles', permission: PERMISSIONS.roleIndex },
  { to: paths.permissions, label: 'Permissions', permission: PERMISSIONS.permissionIndex },
]

/**
 * Navigation is built from the caller's permissions, so a base user is never
 * shown a link that would answer 403.
 */
export function Navbar() {
  const { permissions } = usePermissions()
  const { signOut } = useAuth()
  const { theme, toggle: toggleTheme } = useTheme()
  const { data: me } = useMeQuery()
  const [open, setOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  /**
   * A dropdown has to close on a click anywhere else, and on Escape — Bootstrap's
   * JavaScript would do this, but it owns the DOM in a way that fights React.
   * The listeners exist only while the menu is open.
   */
  useEffect(() => {
    if (!menuOpen) return undefined

    const closeOnOutsideClick = (event: PointerEvent): void => {
      // A pointerdown always originates from a node in the document; narrowing
      // it with `instanceof` would only add a branch nothing can take.
      const target = event.target as Node | null
      if (menuRef.current?.contains(target) === true) return
      setMenuOpen(false)
    }

    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setMenuOpen(false)
    }

    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)

    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [menuOpen])

  const visibleItems = NAV_ITEMS.filter(
    (item) => item.permission === undefined || permissions.can(item.permission),
  )

  const leave = async (everywhere: boolean): Promise<void> => {
    setMenuOpen(false)
    await signOut(everywhere)
  }

  return (
    <nav className="appNavbar navbar navbar-expand-lg">
      <div className="appNavbar__inner container-fluid">
        <Link className="appNavbar__brand navbar-brand" to={paths.myAlbums}>
          <i className="bi bi-images me-2" aria-hidden="true" />
          {config.appName}
        </Link>

        <button
          type="button"
          className="navbar-toggler"
          aria-expanded={open}
          aria-label="Toggle navigation"
          onClick={() => {
            setOpen((value) => !value)
          }}
        >
          <span className="navbar-toggler-icon" />
        </button>

        <div className={`collapse navbar-collapse${open ? ' show' : ''}`}>
          <ul className="navbar-nav me-auto">
            {visibleItems.map((item) => (
              <li className="nav-item" key={item.to}>
                <NavLink
                  className={({ isActive }) =>
                    `appNavbar__link nav-link${isActive ? ' active' : ''}`
                  }
                  to={item.to}
                  onClick={() => {
                    setOpen(false)
                  }}
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>

          <div className="dropdown" ref={menuRef}>
            <button
              type="button"
              // Filled while open, so the button itself shows the menu's state.
              className={`btn btn-sm dropdown-toggle ${menuOpen ? 'btn-secondary' : 'btn-outline-secondary'}`}
              aria-expanded={menuOpen}
              onClick={() => {
                setMenuOpen((value) => !value)
              }}
            >
              <i className="bi bi-person-circle me-1" aria-hidden="true" />
              {me === undefined ? 'Account' : `${me.first_name} ${me.last_name}`}
            </button>

            <ul className={`dropdown-menu dropdown-menu-end${menuOpen ? ' show' : ''}`}>
              <li>
                <Link
                  className="dropdown-item"
                  to={paths.profile}
                  onClick={() => {
                    setMenuOpen(false)
                  }}
                >
                  Profile
                </Link>
              </li>
              <li>
                <Link
                  className="dropdown-item"
                  to={paths.health}
                  onClick={() => {
                    setMenuOpen(false)
                  }}
                >
                  API status
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={toggleTheme}
                  // The control says what it will do, not what is on now — a
                  // switch labelled with its own state reads as an assertion.
                  aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                >
                  <i
                    className={`bi ${theme === 'dark' ? 'bi-sun' : 'bi-moon-stars'} me-1`}
                    aria-hidden="true"
                  />
                  {theme === 'dark' ? 'Light theme' : 'Dark theme'}
                </button>
              </li>
              <li>
                <hr className="dropdown-divider" />
              </li>
              <li>
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    void leave(false)
                  }}
                >
                  Sign out
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="dropdown-item text-danger"
                  onClick={() => {
                    void leave(true)
                  }}
                >
                  Sign out everywhere
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </nav>
  )
}
