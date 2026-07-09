import LoginPage from '../../support/pages/LoginPage';
import { VALID_USERNAME, VALID_PASSWORD } from './consts';

describe('Auth - Protected Routes', () => {
  const loginPage = new LoginPage();

  beforeEach(() => {
    loginPage.visit();
  });

  it('when not logged in, should redirect unauthenticated user to /login', () => {
    cy.visit('/');
    cy.location('pathname').should('eq', '/login');
  });

  it('when user authenticates with right permissions, should allow authenticated user to access protected routes', () => {
    cy.login();
    cy.visit('/stations');
    cy.location('pathname').should('eq', '/stations');
  });

  it('when user has permission for some of the pages, should allows authenticated user to access only allowed routes', () => {
    cy.injectUsernameAndPasswordIntoPocketBase({
      username: VALID_USERNAME,
      password: VALID_PASSWORD,
      permission: ['dashboard'],
    }).then(() => {
      cy.login(VALID_USERNAME, VALID_PASSWORD, ['dashboard']);
      cy.visit('/stations');
      cy.location('pathname').should('eq', '/');
    });
  });
});
