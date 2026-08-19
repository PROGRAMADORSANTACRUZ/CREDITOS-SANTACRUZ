#!/bin/sh
set -e

if [ "${RUN_DB_INIT:-false}" = "true" ]; then
  echo "[start] Ejecutando initDb en segundo plano..."
  (
    if node /app/server/dist/scripts/initDb.js && \
       node /app/server/dist/scripts/initPermisos.js && \
       node /app/server/dist/scripts/crearAdmin.js && \
       node /app/server/dist/scripts/initInvitaciones.js && \
       node /app/server/dist/scripts/initVinculacionClientes.js && \
       node /app/server/dist/scripts/initRegistroProveedores.js && \
       node /app/server/dist/scripts/initRegistroActualizacionProveedores.js; then
      echo "[start] initDb y tablas de modulos completados."
    else
      echo "[start] init de DB/modulos fallo; la API sigue arriba."
    fi
  ) &
fi

echo "[start] Iniciando backend en :4001"
node /app/server/dist/index.js &

echo "[start] Iniciando nginx en :80"
exec nginx -g 'daemon off;'
