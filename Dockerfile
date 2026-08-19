FROM node:20-alpine AS frontend-build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM node:20-alpine AS backend-build
WORKDIR /app/server

COPY server/package*.json ./
RUN npm ci

COPY server/tsconfig.json ./
COPY server/src ./src
RUN npm run build
RUN cp src/schema.sql dist/schema.sql

FROM node:20-alpine AS backend-deps
WORKDIR /app/server

COPY server/package*.json ./
RUN npm ci --omit=dev

FROM nginx:1.27-alpine AS runtime
RUN apk add --no-cache nodejs

WORKDIR /app

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY start.sh /start.sh
RUN chmod +x /start.sh

COPY --from=frontend-build /app/dist /usr/share/nginx/html
COPY --from=backend-build /app/server/dist /app/server/dist
COPY --from=backend-deps /app/server/node_modules /app/server/node_modules
COPY --from=backend-deps /app/server/package*.json /app/server/

EXPOSE 80
CMD ["/start.sh"]
