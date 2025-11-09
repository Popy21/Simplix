# Simplix API - Dockerfile Multi-stage

# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Copier package files
COPY package*.json ./

# Installer toutes les dépendances (dev + prod)
RUN npm ci

# Copier le code source
COPY . .

# Compiler TypeScript
RUN npm run build

# Stage 2: Production
FROM node:18-alpine

WORKDIR /app

# Installer curl pour healthcheck
RUN apk add --no-cache curl

# Copier package files
COPY package*.json ./

# Installer seulement les dépendances de production
RUN npm ci --only=production && npm cache clean --force

# Copier le code compilé du stage builder
COPY --from=builder /app/dist ./dist

# Créer répertoire uploads
RUN mkdir -p /app/uploads && chown -R node:node /app

# Utiliser utilisateur non-root
USER node

# Exposer le port
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Démarrer l'application
CMD ["node", "dist/index.js"]
