#!/bin/bash

if [ ! -f .env ]; then
    echo "❌ .env not found. Run 'make init' first."
    exit 1
fi

set -a
source .env
set +a

API_BASE_URL="${VITE_API_BASE_URL:-http://localhost:8084}"
PORT="${CLIENT_PORT:-8092}"

echo "📦 Building and starting the client container..."
docker compose up -d --build

echo "⏳ Waiting for the Vite dev server..."
for _ in $(seq 1 60); do
    if curl -fsS -o /dev/null "http://localhost:${PORT}"; then
        echo "✅ Client is up!"
        break
    fi
    sleep 2
done

echo "🩺 Checking the REST API at ${API_BASE_URL}..."
if curl -fsS "${API_BASE_URL}/health" | grep -q '"status":"ok"'; then
    echo "✅ API is healthy."
else
    echo "⚠️  The API at ${API_BASE_URL} did not report a healthy status."
    echo "   Start it first — the client needs it for anything beyond the login screen."
fi

echo ""
echo "✅ Ready!"
echo ""
echo "  Client : http://localhost:${PORT}"
echo "  API    : ${API_BASE_URL}"
echo ""
echo "Register an account at http://localhost:${PORT}/register."
echo "A fresh account has no roles — grant one from the API's console to see the"
echo "moderator/admin/super-admin screens."
