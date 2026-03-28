FROM node:20-bookworm-slim AS builder

WORKDIR /app
ENV NODE_ENV=development
ENV NPM_CONFIG_PRODUCTION=false

COPY package*.json ./
RUN npm install -g npm@11.12.1 \
  && npm ci --include=dev --no-audit --no-fund \
  && test -f node_modules/typescript/bin/tsc \
  && test -f node_modules/vite/client.d.ts

COPY . .

ARG VITE_API_URL=/
ARG VITE_SSE_URL=
ARG VITE_WS_URL=
ARG VITE_TELEGRAM_BOT_NAME=samplebot
ARG VITE_ARENA_REQUIRE_AUTH=false

ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_SSE_URL=${VITE_SSE_URL}
ENV VITE_WS_URL=${VITE_WS_URL}
ENV VITE_TELEGRAM_BOT_NAME=${VITE_TELEGRAM_BOT_NAME}
ENV VITE_ARENA_REQUIRE_AUTH=${VITE_ARENA_REQUIRE_AUTH}

RUN npx tsc && npx vite build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
