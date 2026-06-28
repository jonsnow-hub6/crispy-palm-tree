import './commands';

// Global setup for e2e tests
beforeEach(() => {
  // Clear storage between tests for isolation
  cy.window().then((win) => win.localStorage.clear());
  // By default, set up mocked API responses (tests can override)
  cy.mockApi();
});

export {};
