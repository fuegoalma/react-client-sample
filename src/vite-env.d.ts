/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_APP_NAME?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** Runtime configuration injected by the production image's entrypoint. */
interface AppRuntimeConfig {
  apiBaseUrl?: string
  appName?: string
}

interface Window {
  __APP_CONFIG__?: AppRuntimeConfig
}
