#!/bin/bash
set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

echo "================================"
echo "TG Template Webapp - Package"
echo "================================"
echo ""

# Create deployment package from artifacts
PACKAGE_DIR="$PROJECT_ROOT/deployment/package"
rm -rf "$PACKAGE_DIR"
mkdir -p "$PACKAGE_DIR"

# Copy artifacts
cp -r "$PROJECT_ROOT/deployment/artifacts" "$PACKAGE_DIR/"

# Copy templates
cp -r "$PROJECT_ROOT/deployment/templates" "$PACKAGE_DIR/"

# Copy cicd-package.json
cp "$PROJECT_ROOT/deployment/cicd-package.json" "$PACKAGE_DIR/"

# Create final zip
cd "$PROJECT_ROOT/deployment"
rm -f tg-template-webapp.zip
zip -r tg-template-webapp.zip package/

echo ""
echo "================================"
echo "Package complete!"
echo "================================"
echo ""
echo "Package: deployment/tg-template-webapp.zip"
ls -la "$PROJECT_ROOT/deployment/tg-template-webapp.zip"
