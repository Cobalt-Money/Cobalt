#!/usr/bin/env bash
# Syncs .env files from the main worktree to the current worktree.
# Works for any worktree, regardless of nesting structure.

set -euo pipefail

main=$(git worktree list --porcelain | awk '/^worktree / {print $2; exit}')
current=$(pwd)

if [ "$main" = "$current" ]; then
  echo "Already in the main worktree, nothing to sync."
  exit 0
fi

count=0

# Find all .env* files in the main worktree (excluding node_modules, .git, dist)
while IFS= read -r src; do
  # Get the relative path from the main worktree
  rel="${src#"$main"/}"
  dest="$current/$rel"

  mkdir -p "$(dirname "$dest")"
  cp "$src" "$dest"
  echo "  ✓ $rel"
  ((count++))
done < <(find "$main" -name ".env*" \
  -not -path "*/node_modules/*" \
  -not -path "*/.git/*" \
  -not -path "*/dist/*" \
  -not -path "*/.turbo/*" \
  -type f 2>/dev/null)

echo ""
echo "Synced $count env file(s) from main worktree."

# Give this worktree a unique ZERO_APP_ID so parallel zero-cache instances
# don't share the same replica database / CVR storage.
zero_env="$current/apps/zero-cache/.env"
if [ -f "$zero_env" ]; then
  random_suffix=$(openssl rand -hex 6)
  sed -i '' "s/^ZERO_APP_ID=.*/ZERO_APP_ID=zero_dev_${random_suffix}/" "$zero_env"
  echo "  ✓ ZERO_APP_ID set to zero_dev_${random_suffix}"
fi
