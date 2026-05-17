FROM node:22-slim as build
WORKDIR /opt/api

RUN apt-get update && apt-get install -y openssl ca-certificates

ENV PRISMA_CLI_BINARY_TARGETS=debian-openssl-3.0.x,linux-arm64-openssl-3.0.x

COPY package.json nest-cli.json ./
RUN npm install

COPY ./src ./src
COPY ./prisma ./prisma
COPY ./test ./test
COPY eslint.config.mjs .prettierrc .prettierignore ./

RUN npx prisma generate --schema prisma/schema

RUN npx prisma --version

COPY tsconfig.json tsconfig.build.json ./
RUN npm run lint && npm run format:check
RUN npm run build

FROM node:22-slim
WORKDIR /opt/api

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

ENV PRISMA_SKIP_POSTINSTALL_GENERATE=true
ENV PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1

RUN chown -R node:node /opt/api
USER node

COPY --chown=node:node --from=build /opt/api/node_modules ./node_modules
COPY --chown=node:node --from=build /opt/api/dist ./dist
COPY --chown=node:node prisma ./prisma
COPY --chown=node:node src ./src
COPY --chown=node:node test ./test
COPY --chown=node:node package.json tsconfig.build.json tsconfig.json prisma.config.ts ./

ENTRYPOINT npx prisma migrate deploy && \
    exec node dist/main