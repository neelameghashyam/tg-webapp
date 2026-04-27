#!/bin/bash
set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

echo "================================"
echo "TG Template Webapp - Build"
echo "================================"
echo ""

# Clean artifacts directory
rm -rf "$PROJECT_ROOT/deployment/artifacts"
mkdir -p "$PROJECT_ROOT/deployment/artifacts"

# Build frontend
echo "[1/2] Building frontend..."
cd "$PROJECT_ROOT/frontend"
npm ci
npm run build
echo "Frontend built to deployment/artifacts/frontend/"
echo ""

# Build backend + cron (esbuild single-file bundles)
echo "[2/2] Building backend + cron Lambdas (esbuild)..."
cd "$PROJECT_ROOT/backend"
npm ci
node build-lambda.mjs
echo ""

echo "================================"
echo "Build complete!"
echo "================================"
echo ""
echo "Artifacts:"
ls -la "$PROJECT_ROOT/deployment/artifacts/"
