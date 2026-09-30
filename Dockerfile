FROM node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293 AS build

WORKDIR /app
RUN apk add --no-cache python3
COPY package.json package-lock.json .npmrc ./
COPY scripts/security/check_npm_supply_chain.py ./scripts/security/check_npm_supply_chain.py
COPY security/npm-malware-blocklist.csv security/npm-lifecycle-allowlist.json ./security/
RUN python3 scripts/security/check_npm_supply_chain.py --repo . --offline-reviewed --skip-installed \
    && npm ci --ignore-scripts --no-audit --fund=false \
    && npm audit signatures \
    && npm rebuild @parcel/watcher@2.5.6 cypress@14.5.4 esbuild@0.25.4 esbuild@0.25.12 lmdb@3.2.6 msgpackr-extract@3.0.3 --ignore-scripts=false \
    && python3 scripts/security/check_npm_supply_chain.py --repo . --offline-reviewed
COPY . .
RUN npm run build:production

FROM nginx:1.29-alpine@sha256:5616878291a2eed594aee8db4dade5878cf7edcb475e59193904b198d9b830de AS runtime

RUN apk upgrade --no-cache

ENV API_UPSTREAM=http://api-gateway:3000
ENV NGINX_ENVSUBST_FILTER=API_UPSTREAM

COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist/osc-web-app/browser/ /usr/share/nginx/html/
COPY docker/runtime-config.json /usr/share/nginx/html/assets/runtime-config.json

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=5 \
  CMD wget -qO- http://127.0.0.1/healthz >/dev/null || exit 1

EXPOSE 80
