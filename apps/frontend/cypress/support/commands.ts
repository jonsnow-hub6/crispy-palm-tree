/// <reference types="cypress" />
// Custom Cypress commands

declare global {
  namespace Cypress {
    interface Chainable {
      login(username?: string, password?: string): Chainable<Element>;
      logout(): Chainable<Element>;
      mockApi(): Chainable<void>;
      setPocketBaseAuth(auth: any): Chainable<void>;
    }
  }
}

Cypress.Commands.add('mockApi', () => {
  // Load fixtures and set up common intercepts for PocketBase endpoints
  cy.fixture('auth.json').then((auth) => {
    // Auth endpoint
    cy.intercept('POST', '**/api/collections/users/auth-with-password', (req) => {
      req.reply({ statusCode: 200, body: auth });
    });
    // user record fetches
    cy.intercept('GET', '**/api/collections/users/*', (req) => {
      req.reply({ statusCode: 200, body: auth.record });
    });
  });

  cy.fixture('stations.json').then((stations) => {
    cy.intercept('GET', '**/api/collections/stations/records*', (req) => {
      req.reply({ statusCode: 200, body: stations });
    });
  });

  cy.fixture('presets.json').then((presets) => {
    cy.intercept('GET', '**/api/collections/presets/records*', (req) => {
      req.reply({ statusCode: 200, body: presets });
    });
  });

  cy.intercept('GET', '**/api/collections/**/subscribe*', {
    statusCode: 200,
    body: {},
  });
});

Cypress.Commands.add('setPocketBaseAuth', (auth) => {
  cy.window().then((win) => {
    const authStoreValue = {
      token: auth.token,
      record: auth.record,
    };
    win.localStorage.setItem('pocketbase_auth', JSON.stringify(authStoreValue));
  });
});

Cypress.Commands.add('login', (username = 'testuser', password = 'password') => {
  // Directly seed the PocketBase auth store for stable authenticated tests
  cy.fixture('auth.json').then((auth) => {
    cy.setPocketBaseAuth(auth);
  });
});

Cypress.Commands.add('logout', () => {
  cy.window().then((win) => {
    try {
      win.localStorage.clear();
    } catch (e) {
      // ignore
    }
  });
  cy.visit('/login');
});

export {};
