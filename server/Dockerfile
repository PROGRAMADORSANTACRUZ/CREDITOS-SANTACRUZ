FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build
RUN cp src/schema.sql dist/schema.sql

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

EXPOSE 4001
CMD ["sh", "-c", "if [ \"${RUN_DB_INIT:-false}\" = \"true\" ]; then node dist/scripts/initDb.js; fi; node dist/index.js"]
