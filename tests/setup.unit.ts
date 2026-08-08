/**
 * Unit tests exercise layers in isolation — no DOM, no network. The setup only
 * has to make the config module resolvable, since `src/config` reads
 * `import.meta.env` at import time.
 */
process.env['VITE_API_BASE_URL'] ??= 'http://localhost:8084'
