# 6. The API URL is read at runtime, not built in

**Status:** accepted

## Context

Vite substitutes `import.meta.env.*` at build time. An API URL baked in that way
makes the image environment-specific: staging and production need two builds of
the same commit, and the artifact that was tested is not the artifact deployed.

## Decision

The production image's entrypoint writes `env.js` into the document root at
container start, and `src/config/index.ts` resolves `window.__APP_CONFIG__`
first, falling back to `import.meta.env` for local development. `public/env.js`
is an empty stub in dev.

`import.meta.env` is never read outside `src/config`.

## Consequences

- One built image runs against any environment:
  `docker run -e VITE_API_BASE_URL=https://api.example.com …`. The CD pipeline
  asserts this by starting the real image with a made-up host and checking it
  comes back in `env.js`.
- `index.html` and `env.js` must never be cached, while every fingerprinted
  asset can be cached forever. Both rules live in `docker/apache/app.conf`.
- There are exactly two deliberate exceptions to "never read `import.meta.env`
  outside `src/config`", both build-time by nature rather than deployment-time,
  and both commented where they appear: `VITE_DEMO` in `src/main.tsx`, which
  must stay a literal so the mock API is dropped from a normal build, and
  Vite's own `BASE_URL` in `src/app/App.tsx`, which is the subdirectory the demo
  is published under.
