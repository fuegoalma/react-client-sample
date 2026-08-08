DC  := docker compose
APP := $(DC) exec -T client

# The deployable artifact, built and run straight from the Dockerfile's prod
# stage — the same image the CD pipeline produces.
PROD_IMAGE      := photos-react-client
PROD_PORT       ?= 8092
PROD_API_URL    ?= http://localhost:8084

.PHONY: help init setup up down restart rebuild logs sh install \
        build preview prod-build prod-run \
        test test-unit test-functional test-one test-e2e e2e-install \
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
	@echo "  preview              Serve the built bundle on PREVIEW_PORT (default 8093)"
	@echo "  prod-build           Build the deployable Apache image (Dockerfile prod stage)"
	@echo "  prod-run             Run that image on PROD_PORT (stop the dev stack first)"
	@echo "  test                 Run the full Vitest suite (unit + functional)"
	@echo "  test-unit            Run unit tests only"
	@echo "  test-functional      Run functional tests only"
	@echo "  test-one file=<path> Run a single test file"
	@echo "  test-e2e             Run the Playwright suite against the running stack (host)"
	@echo "                       Set E2E_ADMIN_EMAIL in .env to include the RBAC screens"
	@echo "  e2e-install          Install the Playwright browsers (host, run once)"
	@echo "  cs-check             Show code style violations (Prettier + ESLint + Stylelint)"
	@echo "  cs-fix               Auto-fix code style across the whole codebase"
	@echo "  typecheck            Run the TypeScript compiler in check-only mode"
	@echo "  check                cs-check + typecheck + test (exactly what CI runs)"
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

preview: build
	@echo "→ http://localhost:$${PREVIEW_PORT:-8093}"
	$(DC) exec client npm run preview

# --- the deployable image --------------------------------------------------

prod-build:
	docker build --target prod -t $(PROD_IMAGE) .

prod-run:
	@echo "→ http://localhost:$(PROD_PORT)  (API: $(PROD_API_URL))"
	docker run --rm -p $(PROD_PORT):80 -e VITE_API_BASE_URL=$(PROD_API_URL) $(PROD_IMAGE)

# --- tests -----------------------------------------------------------------

test:
	$(APP) npm run test

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

check: cs-check typecheck test

clean:
	rm -rf dist coverage playwright-report test-results node_modules/.tmp node_modules/.vite
