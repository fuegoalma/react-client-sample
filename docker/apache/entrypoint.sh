#!/bin/sh
# Writes the runtime configuration the SPA reads on boot, then hands over to
# Apache. This is what makes one built image reusable across environments: the
# API URL is an env var of the *container*, not a build argument.
set -eu

cat > /usr/local/apache2/htdocs/env.js <<EOF
window.__APP_CONFIG__ = {
  apiBaseUrl: "${VITE_API_BASE_URL:-http://localhost:8084}",
  appName: "${VITE_APP_NAME:-Photos Client}"
};
EOF

echo "→ API base URL: ${VITE_API_BASE_URL:-http://localhost:8084}"

exec httpd-foreground "$@"
