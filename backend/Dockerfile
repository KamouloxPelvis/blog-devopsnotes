# =========================================================
# Stage 1 — Build TypeScript
# =========================================================

FROM node:20-alpine AS build

WORKDIR /app

# Copier les fichiers de dépendances et la configuration TypeScript
COPY package*.json tsconfig.json ./

# Installation reproductible depuis package-lock.json
RUN npm ci

# Copier le code source
COPY src ./src

# Compiler TypeScript
RUN npx --node-options="--max-old-space-size=2048" tsc


# =========================================================
# Stage 2 — Production
# =========================================================

FROM node:20-alpine

WORKDIR /app

# Copier uniquement les fichiers de dépendances
COPY package*.json ./

# Installer uniquement les dépendances de production
RUN npm ci --omit=dev

# Copier le build TypeScript
COPY --from=build /app/dist ./dist

ENV PORT=5000

EXPOSE 5000

CMD ["node", "--max-old-space-size=1024", "dist/index.js"]