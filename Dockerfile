FROM node:26.10.0-alpine3.24@sha256:0b36e8c136b94cd4fcf02188228e76c31ad5872eef3fec8cbd2eee500cfd9e80 AS build

WORKDIR /app
RUN apk add --no-cache python3
COPY package.json package-lock.json .npmrc ./
COPY scripts/security/check_npm_supply_chain.py ./scripts/security/check_npm_supply_chain.py
COPY security/npm-malware-blocklist.csv security/npm-lifecycle-allowlist.json ./security/
RUN python3 scripts/security/check_npm_supply_chain.py --repo . --offline-reviewed --skip-installed \
    && npm ci --ignore-scripts --no-audit --fund=false \
    && npm audit signatures \
    && python3 scripts/security/check_npm_supply_chain.py --repo . --offline-reviewed
COPY . .
RUN npm run build:production

FROM nginx:1.29-alpine@sha256:5616878291a2eed594aee8db4dade5878cf7edcb475e59193904b198d9b830de AS runtime

RUN apk upgrade --no-cache

ENV API_UPSTREAM=http://api-gateway:3000
ENV WEBAPP_API_BASE_URL=/api/v1
ENV DEMO_MODE=false
ENV NGINX_ENVSUBST_FILTER=API_UPSTREAM

COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist/osc-web-app/browser/ /usr/share/nginx/html/
COPY docker/runtime-config.json.template /opt/osc/runtime-config.json.template
COPY docker/40-runtime-config.sh /docker-entrypoint.d/40-runtime-config.sh
RUN apk upgrade --no-cache libuuid \
    && apk add --no-cache 'pcre2>=10.49-r0' \
    && sed -i 's/\r$//' /docker-entrypoint.d/40-runtime-config.sh \
    && chmod 0555 /docker-entrypoint.d/40-runtime-config.sh \
    && sed -i 's#pid .*#pid /tmp/nginx.pid;#' /etc/nginx/nginx.conf \
    && chown -R nginx:nginx /etc/nginx/conf.d /usr/share/nginx/html /var/cache/nginx

USER nginx

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=5 \
  CMD wget -qO- http://127.0.0.1:8080/healthz >/dev/null || exit 1

EXPOSE 8080
