#!/usr/bin/env bash
set -euo pipefail

./apps/frontend/cypress/scripts/cypress-setup.sh

echo "Opening Cypress..."

npx cypress open "$@"