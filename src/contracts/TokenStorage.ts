import type { TokenPair } from '@/types'

/** What is persisted between page loads — the pair, minus the derived fields. */
export interface StoredTokens {
  readonly accessToken: string
  readonly refreshToken: string
}

/**
 * Persistence seam for the token pair, mirroring the API's own
 * `models/contract/` interfaces: the store depends on this, never on
 * `localStorage`, so tests inject an in-memory implementation.
 */
export interface TokenStorage {
  readonly read: () => StoredTokens | null
  readonly write: (tokens: StoredTokens) => void
  readonly clear: () => void
}

export function toStoredTokens(pair: TokenPair): StoredTokens {
  return { accessToken: pair.access_token, refreshToken: pair.refresh_token }
}
