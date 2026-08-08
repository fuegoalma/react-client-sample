import type { StoredTokens, TokenStorage } from '@/contracts'

const STORAGE_KEY = 'photos-client.tokens'

function isStoredTokens(value: unknown): value is StoredTokens {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate['accessToken'] === 'string' && typeof candidate['refreshToken'] === 'string'
  )
}

/**
 * localStorage-backed token storage.
 *
 * The API returns the refresh token in the response body, so an httpOnly
 * cookie is not available to us; localStorage is the only place a token can
 * survive a reload. The trade-off (readable by injected scripts) is accepted
 * and confined to this class — swapping the strategy means one new
 * `TokenStorage` implementation, nothing else.
 */
export class LocalStorageTokenStorage implements TokenStorage {
  constructor(private readonly storage: Storage) {}

  read(): StoredTokens | null {
    let raw: string | null
    try {
      raw = this.storage.getItem(STORAGE_KEY)
    } catch {
      // Private-mode browsers can throw on access.
      return null
    }
    if (raw === null) return null

    try {
      const parsed: unknown = JSON.parse(raw)
      return isStoredTokens(parsed) ? parsed : null
    } catch {
      return null
    }
  }

  write(tokens: StoredTokens): void {
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(tokens))
    } catch {
      // A full or unavailable store must not break the session in memory.
    }
  }

  clear(): void {
    try {
      this.storage.removeItem(STORAGE_KEY)
    } catch {
      // Nothing to do — the in-memory state is cleared regardless.
    }
  }
}

/** Used by tests and by any environment without a DOM. */
export class InMemoryTokenStorage implements TokenStorage {
  private tokens: StoredTokens | null = null

  read(): StoredTokens | null {
    return this.tokens
  }

  write(tokens: StoredTokens): void {
    this.tokens = tokens
  }

  clear(): void {
    this.tokens = null
  }
}

/** Picks the storage appropriate for the current environment. */
export function createTokenStorage(): TokenStorage {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return new InMemoryTokenStorage()
  }
  return new LocalStorageTokenStorage(window.localStorage)
}
