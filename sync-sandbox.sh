#!/usr/bin/env bash
# Copies .sandbox from the main worktree into the current worktree (gitignored).
# Same pattern as sync-env.sh — run after creating a linked worktree.

set -euo pipefail

main=$(git worktree list --porcelain | awk '/^worktree / {print $2; exit}')
current=$(pwd)

if [ "$main" = "$current" ]; then
  echo "Already in the main worktree, nothing to sync."
  exit 0
fi

if [ ! -d "$main/.sandbox" ]; then
  echo "No .sandbox in main worktree ($main); nothing to copy."
  exit 0
fi

mkdir -p "$current/.sandbox"
rsync -a "$main/.sandbox/" "$current/.sandbox/"
echo "Synced .sandbox from main worktree."
