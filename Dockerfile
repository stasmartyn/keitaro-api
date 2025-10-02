### Stage: deps — install all dependencies (including dev) for build
FROM node:20-alpine AS deps

WORKDIR /app

COPY package*.json ./
# Speed up install, skip lifecycle scripts (e.g., husky); dev deps are needed to build TS
RUN npm ci --ignore-scripts --no-audit --no-fund

### Stage: build — compile TypeScript to dist
FROM deps AS build

COPY tsconfig.json ./

COPY src ./src

RUN npx tsc -p tsconfig.json \
    && mkdir -p dist/assets \
    && cp -r src/assets dist/assets || true

### Stage: runner — minimal production image
FROM node:20-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app

# Install only production dependencies; skip scripts to avoid dev hooks (husky)
COPY --from=deps /app/package*.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund

# Copy compiled app
COPY --from=build /app/dist ./dist

CMD ["node", "dist/main.js"]