#!/usr/bin/env bash
set -e

./apps/frontend/cypress/scripts/cypress-setup.sh

echo "Opening Cypress..."

npx cypress open --config-file apps/frontend/cypress/cypress.config.ts