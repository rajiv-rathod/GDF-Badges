#!/usr/bin/env bash
#
# Pull the latest main, rebuild, refresh the standalone bundle's assets, and
# restart the systemd service. Safe to run by hand or from the GitHub Actions
# "Deploy to Oracle" workflow over SSH.
#
# Overridable env:
#   GDF_REPO_DIR   path to the cloned repo   (default: this script's repo)
#   GDF_SERVICE    systemd service name      (default: gdf-certview)
set -euo pipefail

REPO_DIR="${GDF_REPO_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
SERVICE="${GDF_SERVICE:-gdf-certview}"
cd "$REPO_DIR"

echo "==> Fetching latest main"
git fetch --prune origin main
git reset --hard origin/main

echo "==> Installing dependencies (npm ci)"
npm ci

echo "==> Building apps/web"
npm run build:web

# Next.js standalone output does NOT include static/ or public/ — copy them in.
echo "==> Refreshing standalone assets"
SB="apps/web/.next/standalone/apps/web"
rm -rf "$SB/.next/static" "$SB/public"
mkdir -p "$SB/.next"
cp -r apps/web/.next/static "$SB/.next/static"
cp -r apps/web/public "$SB/public"

echo "==> Restarting $SERVICE"
sudo systemctl restart "$SERVICE"

echo "==> Deployed $(git rev-parse --short HEAD) at $(date -u +%FT%TZ)"
