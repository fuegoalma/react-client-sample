/**
 * Typed application configuration.
 *
 * Resolution order: the runtime config written by the production container's
 * entrypoint (`window.__APP_CONFIG__`, see docker/apache/entrypoint.sh) wins,
 * falling back to Vite's build-time env for local development. That is what
 * lets one built image be pointed at any API host.
 */
export interface AppConfig {
  readonly apiBaseUrl: string
  readonly appName: string
}

const DEFAULTS: AppConfig = {
  apiBaseUrl: 'http://localhost:8084',
  appName: 'Photos Client',
}

function runtime(): AppRuntimeConfig {
  return typeof window === 'undefined' ? {} : (window.__APP_CONFIG__ ?? {})
}

function firstNonEmpty(...values: readonly (string | undefined)[]): string | undefined {
  return values.find((value) => typeof value === 'string' && value.trim() !== '')
}

/** Trailing slashes would produce `//health` once a path is appended. */
function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '')
}

export function resolveConfig(): AppConfig {
  const injected = runtime()

  return {
    apiBaseUrl: stripTrailingSlash(
      firstNonEmpty(injected.apiBaseUrl, import.meta.env.VITE_API_BASE_URL) ?? DEFAULTS.apiBaseUrl,
    ),
    appName: firstNonEmpty(injected.appName, import.meta.env.VITE_APP_NAME) ?? DEFAULTS.appName,
  }
}

export const config: AppConfig = resolveConfig()
