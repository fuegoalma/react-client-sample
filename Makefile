DC  := docker compose
APP := $(DC) exec -T client

# The deployable artifact, built and run straight from the Dockerfile's prod
# stage — the same image the CD pipeline produces.
PROD_IMAGE      := react-client-sample
PROD_PORT       ?= 8092
PROD_API_URL    ?= http://localhost:8084

.PHONY: help init setup up down restart rebuild logs sh install \
        build build-demo preview size storybook build-storybook screenshots \
        prod-build prod-run \
        test test-coverage test-unit test-functional test-contract test-one test-e2e e2e-install \
        sync-spec spec-verify spec-drift \
        cs-check cs-fix typecheck check clean

help:
	@echo "Available targets:"
	@echo "  init                 Create .env from .env.example"
	@echo "  setup                Start Docker, install deps, wait for the API"
	@echo "  up / down / restart  Docker Compose lifecycle"
	@echo "  rebuild              Rebuild the client image and restart the container"
	@echo "  logs                 Follow container logs"
	@echo "  sh                   Shell into the client container"
	@echo "  install              Install npm dependencies inside the container"
	@echo "  build                Build the production bundle"
	@echo "  build-demo           Build the MSW-backed demo bundle"
	@echo "  preview              Serve the built bundle on PREVIEW_PORT (default 8093)"
	@echo "  size                 Check the built bundle against its size budget"
	@echo "  storybook            Run the UI kit on http://localhost:6006 (host)"
	@echo "  build-storybook      Build the static UI kit"
	@echo "  screenshots          Regenerate the README screenshots (host, needs make up)"
	@echo "  prod-build           Build the deployable Apache image (Dockerfile prod stage)"
	@echo "  prod-run             Run that image on PROD_PORT (stop the dev stack first)"
	@echo "  test                 Run the full Vitest suite"
	@echo "  test-coverage        Run it with the 100% coverage thresholds enforced"
	@echo "  test-unit            Run unit tests only"
	@echo "  test-functional      Run functional tests only"
	@echo "  test-contract        Run the OpenAPI contract tests only"
	@echo "  sync-spec            Refetch the OpenAPI document from SPEC_URL, regenerate types"
	@echo "  spec-verify          Check the committed types still match the committed spec"
	@echo "  spec-drift           Ask SPEC_URL whether that spec has moved (read-only)"
	@echo "  test-one file=<path> Run a single test file"
	@echo "  test-e2e             Run the Playwright suite against the running stack (host)"
	@echo "                       Set E2E_ADMIN_EMAIL in .env to include the RBAC screens"
	@echo "  e2e-install          Install the Playwright browsers (host, run once)"
	@echo "  cs-check             Show code style violations (Prettier + ESLint + Stylelint)"
	@echo "  cs-fix               Auto-fix code style across the whole codebase"
	@echo "  typecheck            Run the TypeScript compiler in check-only mode"
	@echo "  check                cs-check + typecheck + build + size + tests with coverage (what CI runs)"
	@echo "  clean                Remove build output and caches"

init:
	./init.sh

setup:
	./setup.sh

up:
	$(DC) up -d

down:
	$(DC) down

restart:
	$(DC) restart

rebuild:
	$(DC) build client
	$(DC) up -d client

logs:
	$(DC) logs -f

sh:
	$(DC) exec client sh

install:
	$(APP) npm install

build:
	$(APP) npm run build

# The published demo: the same client, but answering its own requests from the
# suite's MSW handlers, and served from a project-page subdirectory.
build-demo:
	$(APP) npm run build:demo

# The bundle budget, measured on the built assets — so it needs `build` first.
size: build
	$(APP) npm run size

preview: build
	@echo "→ http://localhost:$${PREVIEW_PORT:-8093}"
	$(DC) exec client npm run preview

# --- the deployable image --------------------------------------------------

prod-build:
	docker build --target prod -t $(PROD_IMAGE) .

prod-run:
	@echo "→ http://localhost:$(PROD_PORT)  (API: $(PROD_API_URL))"
	docker run --rm -p $(PROD_PORT):80 -e VITE_API_BASE_URL=$(PROD_API_URL) $(PROD_IMAGE)

# --- documentation ---------------------------------------------------------

# Regenerates the README's screenshots from the running stack. On the host, like
# the rest of Playwright: it drives a real browser.
screenshots:
	node scripts/screenshots.mjs

# --- the UI kit ------------------------------------------------------------

# Storybook runs on the host: it needs a browser to be useful, like Playwright.
storybook:
	npx storybook dev -p 6006

build-storybook:
	npx storybook build -o storybook-static

# --- the API contract ------------------------------------------------------

# Where the OpenAPI document is read from — by `sync-spec`, by `spec-drift`, and
# by `.github/workflows/spec-drift.yml` through the API_SPEC_URL repository
# variable. One source for all three, so what CI compares against and what you
# refresh from cannot be two different documents.
#
# It is the API repository's own committed file rather than a running instance:
# `config/openapi.yaml` is what the API serves at `/docs/openapi.yaml`, and a
# file under source control needs no stack up and is reachable from CI.
# Override to ask an instance instead — a local one, or another environment:
#
#   make sync-spec SPEC_URL=http://localhost:8084/docs/openapi.yaml
SPEC_URL ?= https://raw.githubusercontent.com/fuegoalma/yii2-rest-api-sample/master/config/openapi.yaml

# Refetches the document and regenerates the types the contract suite checks
# against. Both halves are committed, so CI can run those tests with no API.
sync-spec:
	curl -fsS $(SPEC_URL) -o tests/contract/openapi.yaml
	$(APP) npx openapi-typescript tests/contract/openapi.yaml -o tests/contract/schema.d.ts
	@echo "→ spec and types refreshed; run 'make test-contract' to see what moved"

# The half of `sync-spec` that needs no API: are the committed types the ones
# this committed spec generates? Catches a yaml refreshed without its second
# half, and a schema.d.ts edited by hand.
#
# What it cannot catch, by construction, is the API moving: it compares the two
# halves of one snapshot, and both halves stay consistent with each other long
# after the document they were taken from has changed. That is `spec-drift`.
spec-verify:
	$(APP) npm run spec:verify

# Has the document moved since it was vendored?
#
# Read-only, which is the whole point: `sync-spec` overwrites both halves of the
# snapshot and leaves you to work out what changed, so it cannot be used to just
# *ask*. This fetches to a temporary file and reports, and answers non-zero when
# the document has moved so a script can use it too.
#
# Reads SPEC_URL, the same document `sync-spec` refreshes from and the workflow
# checks daily — asking one source and refreshing from another is how a drift
# check ends up reporting on something nobody vendored.
SPEC_TMP ?= .openapi.live.yaml

spec-drift:
	@curl -fsS $(SPEC_URL) -o $(SPEC_TMP) \
	  || { echo "→ could not fetch $(SPEC_URL) — check the URL, or set SPEC_URL"; exit 1; }
	@diff -u tests/contract/openapi.yaml $(SPEC_TMP) \
	  && { rm -f $(SPEC_TMP); echo "→ the vendored document still matches $(SPEC_URL)"; } \
	  || { rm -f $(SPEC_TMP); echo "→ the document has moved; run 'make sync-spec', then 'make test-contract'"; exit 1; }

test-contract:
	$(APP) npm run test:contract

# --- tests -----------------------------------------------------------------

test:
	$(APP) npm run test

# What CI runs. The plain `test` target does not enforce the coverage
# thresholds, so a gap only surfaced after a push — `check` must not have that
# blind spot.
test-coverage:
	$(APP) npm run test -- --coverage

test-unit:
	$(APP) npm run test:unit

test-functional:
	$(APP) npm run test:functional

test-one:
	$(APP) npx vitest run $(file)

# Playwright drives a real browser, so it runs on the host against the stack
# started by `make up` rather than inside the Node container. The privileged
# tests need E2E_ADMIN_EMAIL (see .env.example); without it they skip.
e2e-install:
	npx playwright install --with-deps chromium

test-e2e:
	set -a; [ -f .env ] && . ./.env; set +a; npx playwright test

# --- code style & static analysis ------------------------------------------

cs-check:
	$(APP) npm run cs-check

cs-fix:
	$(APP) npm run cs-fix

typecheck:
	$(APP) npm run typecheck

# `build` earns its place next to `typecheck`: tsc in check-only mode never asks
# Vite to resolve an import, an alias or an asset, so a bundle can break while
# the types are perfectly fine.
check: cs-check spec-verify typecheck build size test-coverage

clean:
	rm -rf dist coverage playwright-report test-results node_modules/.tmp node_modules/.vite
