#!/bin/sh
# Writes the runtime configuration the SPA reads on boot, then hands over to
# Apache. This is what makes one built image reusable across environments: the
# API URL is an env var of the *container*, not a build argument.
set -eu

API_URL="${VITE_API_BASE_URL:-http://localhost:8084}"

cat > /usr/local/apache2/htdocs/env.js <<EOF
window.__APP_CONFIG__ = {
  apiBaseUrl: "${API_URL}",
  appName: "${VITE_APP_NAME:-React Client Sample}"
};
EOF

# The Content-Security-Policy is generated here for the same reason env.js is:
# `connect-src` has to name the API's origin, and that origin is only known once
# the container is started. A policy hard-coded in app.conf would either have to
# allow every host — which is most of the point gone — or break the promise that
# one image runs anywhere.
#
# Everything else is 'self': the bundle, the stylesheet and the icon font are all
# served from this origin, and the application has no inline script. `img-src`
# additionally allows the API, which is where uploaded photos are served from,
# and `data:` for the object URLs the upload preview creates.
cat > /usr/local/apache2/conf/app/csp.conf <<EOF
<IfModule mod_headers.c>
    Header always set Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data: ${API_URL}; connect-src 'self' ${API_URL}; object-src 'none'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'"
    Header always set Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
</IfModule>
EOF

echo "→ API base URL: ${API_URL}"

exec httpd-foreground "$@"
