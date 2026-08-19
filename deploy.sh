docker service update \
  --label-add 'traefik.enable=true' \
  --label-add 'traefik.http.routers.creditos.rule=Host(`creditos.grupo-santacruz.com`)' \
  --label-add 'traefik.http.routers.creditos.entrypoints=websecure' \
  --label-add 'traefik.http.routers.creditos.tls=true' \
  --label-add 'traefik.http.routers.creditos.tls.certresolver=letsencrypt' \
  --label-add 'traefik.http.routers.creditos.service=creditos' \
  --label-add 'traefik.http.services.creditos.loadbalancer.server.port=80' \
  --label-add 'traefik.http.routers.creditos-web.rule=Host(`creditos.grupo-santacruz.com`)' \
  --label-add 'traefik.http.routers.creditos-web.entrypoints=web' \
  --label-add 'traefik.http.routers.creditos-web.middlewares=creditos-redirect-https' \
  --label-add 'traefik.http.middlewares.creditos-redirect-https.redirectscheme.scheme=https' \
  --label-add 'traefik.http.middlewares.creditos-redirect-https.redirectscheme.permanent=true' \
  --label-add 'traefik.docker.network=dokploy-network' \
  creditossantacruz-creditossantacruz-lch8qf
