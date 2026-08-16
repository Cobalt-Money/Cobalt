#!/usr/bin/env bash

set -euo pipefail

worker_name="cobalt-sri-359-sandbox-validation"
container_name="cobalt-sri-359-sandbox-validation-sandbox"

if npx wrangler deployments list --name "$worker_name" --json >/dev/null 2>&1; then
  npx wrangler delete "$worker_name" --force
fi

container_id="$(
  npx wrangler containers list --json \
    | jq -r --arg name "$container_name" '.[] | select(.name == $name) | .id' \
    | head -n 1
)"

if [[ -n "$container_id" ]]; then
  printf 'y\n' | npx wrangler containers delete "$container_id"
fi
