#!/bin/sh
set -eu

case "${DEMO_MODE:-false}" in
  true|false) ;;
  *)
    echo "DEMO_MODE must be true or false" >&2
    exit 1
    ;;
esac

case "${WEBAPP_API_BASE_URL:-/api/v1}" in
  *[!A-Za-z0-9:/._-]*)
    echo "WEBAPP_API_BASE_URL contains unsupported characters" >&2
    exit 1
    ;;
esac

export DEMO_MODE="${DEMO_MODE:-false}"
export WEBAPP_API_BASE_URL="${WEBAPP_API_BASE_URL:-/api/v1}"
envsubst '${DEMO_MODE} ${WEBAPP_API_BASE_URL}' \
  < /opt/osc/runtime-config.json.template \
  > /usr/share/nginx/html/assets/runtime-config.json
