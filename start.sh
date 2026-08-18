#!/bin/sh
set -e

if [ "${RUN_DB_INIT:-false}" = "true" ]; then
  echo "[start] Ejecutando initDb en segundo plano..."
  (
    if node /app/server/dist/scripts/initDb.js; then
      echo "[start] initDb completado."
    else
      echo "[start] initDb fallo; la API sigue arriba."
    fi
  ) &
fi

echo "[start] Iniciando backend en :4001"
node /app/server/dist/index.js &

echo "[start] Iniciando nginx en :80"
exec nginx -g 'daemon off;'
