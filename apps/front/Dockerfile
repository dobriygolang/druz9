FROM node:20-alpine AS builder

WORKDIR /app
ENV NODE_ENV=development

COPY package*.json ./
RUN npm ci --include=dev

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

RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
