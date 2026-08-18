#!/bin/sh
set -e

if [ "${RUN_DB_INIT:-false}" = "true" ]; then
  echo "[start] Ejecutando initDb..."
  node /app/server/dist/scripts/initDb.js || echo "[start] initDb fallo; continuando con arranque de API."
fi

echo "[start] Iniciando backend en :4001"
node /app/server/dist/index.js &

echo "[start] Iniciando nginx en :80"
exec nginx -g 'daemon off;'
