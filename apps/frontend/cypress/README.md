Cypress E2E project (co-located)

Run tests:

```
# Open Cypress GUI (starts frontend dev server via Nx)
npx nx run frontend-e2e:open-cypress

# Run headless E2E
npx nx run frontend-e2e:e2e
```

This project uses `cy.intercept()` fixtures to mock PocketBase API responses.
