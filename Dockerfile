# syntax=docker/dockerfile:1
# escape=\

ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-bookworm-slim AS base
WORKDIR /www/api
RUN chown -R node:node /www/api


FROM node:${NODE_VERSION}-bookworm AS dev
WORKDIR /www/api
RUN chown -R node:node /www/api

ENV NODE_ENV=development
USER node

COPY --chown=node:node package*.json ./
RUN npm i

COPY --chown=node:node . .

EXPOSE 3000

RUN npm run test:coverage
CMD [ "npm", "run", "dev" ]

FROM base AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

USER node
COPY --chown=node:node package*.json ./
RUN npm ci

COPY --chown=node:node . .

RUN npm run test
RUN npm run build


FROM base AS production

ENV NODE_ENV=production
USER node

COPY --chown=node:node packa*.json ./
RUN npm ci --omit=dev

COPY --chown=node:node --from=builder /www/api/dist ./dist

CMD [ "node", "./dist/server.js" ]




