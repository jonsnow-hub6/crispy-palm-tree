#!/usr/bin/env bash
set -e

./apps/frontend/cypress/scripts/cypress-setup.sh

echo "Running Cypress..."

npx cypress run --config-file apps/frontend/cypress/cypress.config.ts --headless