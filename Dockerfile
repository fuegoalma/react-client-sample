# Single multi-stage Dockerfile — one source of truth for the environment.
#
#   base  : shared Node runtime with dependencies installed. Never used directly.
#   dev   : local development — the Vite dev server with HMR. Source is bind-mounted
#           by docker-compose (`target: dev`), node_modules stays in the image.
#   build : produces the static bundle. Only an intermediate for `prod`.
#   prod  : self-contained, deployable image — Apache serving the built bundle.
#           Built by the CD pipeline (`target: prod`).

# ---- base: shared runtime + dependencies ----------------------------------
FROM node:24-alpine AS base

WORKDIR /app

# Manifests first so the (slow) install layer is cached until they change.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ---- dev: local development ------------------------------------------------
# The application source is bind-mounted over /app by docker-compose; only
# node_modules comes from the image (kept in a named volume so the host's
# node_modules never shadows it). Apache is not involved — Vite serves.
FROM base AS dev

ENV NODE_ENV=development
EXPOSE 5173
CMD ["npm", "run", "dev"]

# ---- build: compile the static bundle --------------------------------------
FROM base AS build

COPY . .
RUN npm run build

# ---- prod: self-contained deployable image ---------------------------------
FROM httpd:2.4-alpine AS prod

# mod_rewrite/FallbackResource for SPA routing, mod_deflate (+mod_filter) for
# compression, mod_expires/mod_headers for cache policy.
RUN sed -i \
        -e 's|^#\(LoadModule rewrite_module\)|\1|' \
        -e 's|^#\(LoadModule deflate_module\)|\1|' \
        -e 's|^#\(LoadModule filter_module\)|\1|' \
        -e 's|^#\(LoadModule expires_module\)|\1|' \
        -e 's|^#\(LoadModule headers_module\)|\1|' \
        /usr/local/apache2/conf/httpd.conf \
    && printf '\nIncludeOptional conf/app/*.conf\n' >> /usr/local/apache2/conf/httpd.conf

COPY docker/apache/app.conf /usr/local/apache2/conf/app/app.conf
COPY docker/apache/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

COPY --from=build /app/dist/ /usr/local/apache2/htdocs/

# The API URL is injected into env.js at container start, not baked at build,
# so the same image runs against any environment.
ENV VITE_API_BASE_URL=http://localhost:8084 \
    VITE_APP_NAME="Photos Client"

EXPOSE 80
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
