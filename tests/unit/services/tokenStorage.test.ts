import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { InMemoryTokenStorage, LocalStorageTokenStorage, createTokenStorage } from '@/services'

class FakeStorage implements Storage {
  private data = new Map<string, string>()

  get length(): number {
    return this.data.size
  }

  clear(): void {
    this.data.clear()
  }

  getItem(key: string): string | null {
    return this.data.get(key) ?? null
  }

  key(index: number): string | null {
    return [...this.data.keys()][index] ?? null
  }

  removeItem(key: string): void {
    this.data.delete(key)
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value)
  }
}

const tokens = { accessToken: 'a', refreshToken: 'r' }

describe('LocalStorageTokenStorage', () => {
  let backing: FakeStorage
  let storage: LocalStorageTokenStorage

  beforeEach(() => {
    backing = new FakeStorage()
    storage = new LocalStorageTokenStorage(backing)
  })

  it('round-trips a token pair', () => {
    storage.write(tokens)
    expect(storage.read()).toEqual(tokens)
  })

  it('reads nothing when there is no session', () => {
    expect(storage.read()).toBeNull()
  })

  it('forgets the pair when cleared', () => {
    storage.write(tokens)
    storage.clear()
    expect(storage.read()).toBeNull()
  })

  it('ignores a corrupted entry rather than throwing', () => {
    backing.setItem('photos-client.tokens', 'not json')
    expect(storage.read()).toBeNull()
  })

  it('ignores an entry that is not a token pair', () => {
    backing.setItem('photos-client.tokens', JSON.stringify({ accessToken: 1 }))
    expect(storage.read()).toBeNull()
  })

  it('survives a storage that refuses to write', () => {
    // Private-mode browsers throw on setItem once the quota is reached.
    vi.spyOn(backing, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    expect(() => {
      storage.write(tokens)
    }).not.toThrow()
  })

  it('survives a storage that refuses to read', () => {
    vi.spyOn(backing, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    expect(storage.read()).toBeNull()
  })

  it('survives a storage that refuses to forget', () => {
    // Signing out must end the session locally even if the store is unavailable.
    vi.spyOn(backing, 'removeItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    expect(() => {
      storage.clear()
    }).not.toThrow()
  })
})

describe('createTokenStorage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('falls back to memory where there is no DOM', () => {
    // The unit project runs in Node, so this is the real environment here.
    expect(createTokenStorage()).toBeInstanceOf(InMemoryTokenStorage)
  })

  it('persists to localStorage in a browser', () => {
    vi.stubGlobal('window', { localStorage: new FakeStorage() })
    expect(createTokenStorage()).toBeInstanceOf(LocalStorageTokenStorage)
  })

  it('falls back to memory in a browser without localStorage', () => {
    vi.stubGlobal('window', {})
    expect(createTokenStorage()).toBeInstanceOf(InMemoryTokenStorage)
  })
})

describe('InMemoryTokenStorage', () => {
  it('behaves like the persistent one, without a DOM', () => {
    const storage = new InMemoryTokenStorage()
    expect(storage.read()).toBeNull()

    storage.write(tokens)
    expect(storage.read()).toEqual(tokens)

    storage.clear()
    expect(storage.read()).toBeNull()
  })
})

describe('A stored value that is not a token pair', () => {
  it('ignores a stored null', () => {
    // `JSON.parse('null')` is valid JSON and not an object — the guard has to
    // answer that as firmly as it answers a wrong shape.
    const backing = new FakeStorage()
    backing.setItem('photos-client.tokens', 'null')
    expect(new LocalStorageTokenStorage(backing).read()).toBeNull()
  })

  it('ignores a stored array', () => {
    const backing = new FakeStorage()
    backing.setItem('photos-client.tokens', '["a","r"]')
    expect(new LocalStorageTokenStorage(backing).read()).toBeNull()
  })
})
