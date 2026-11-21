#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

TARGET_TAG="${1:-${TARGET_TAG:-}}"
if [ -z "$TARGET_TAG" ]; then
  echo "Uso: ./scripts/rollback.sh <tag>"
  exit 1
fi

echo "==> Rollback manual a $TARGET_TAG"
IMAGE_TAG="$TARGET_TAG" ./scripts/deploy.sh
