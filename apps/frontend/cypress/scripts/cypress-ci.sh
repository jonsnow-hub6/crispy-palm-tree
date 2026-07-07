#!/usr/bin/env bash
set -euo pipefail
echo "Args: $@"
./apps/frontend/cypress/scripts/cypress-setup.sh

echo "Running Cypress..."

npx cypress run "$@"