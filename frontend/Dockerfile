# =========================================================
# Stage 1 — Build
# =========================================================

FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm ci --legacy-peer-deps

COPY . .

RUN --mount=type=secret,id=SENTRY_AUTH_TOKEN \
    export SENTRY_AUTH_TOKEN=$(cat /run/secrets/SENTRY_AUTH_TOKEN) && \
    NODE_OPTIONS="--max-old-space-size=1536" npm run build


# =========================================================
# Stage 2 — Production
# =========================================================

FROM nginx:stable-alpine

COPY --from=build /app/build /usr/share/nginx/html

# Configuration Nginx pour le routage SPA React
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]