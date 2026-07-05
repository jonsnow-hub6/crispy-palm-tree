/// <reference types="cypress-real-events" />
import './commands';

// Global setup for e2e tests
beforeEach(() => {
  // Clear storage between tests for isolation
  cy.window().then((win) => win.localStorage.clear());
});

export {};
