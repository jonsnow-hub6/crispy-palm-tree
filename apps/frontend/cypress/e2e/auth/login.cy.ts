import LoginPage from '../../support/pages/LoginPage';
import {
  INVALID_PASSWORD,
  INVALID_USERNAME,
  VALID_PASSWORD,
  VALID_USERNAME,
} from './consts';

describe('Auth - Login', () => {
  const loginPage = new LoginPage();

  beforeEach(() => {
    loginPage.visit();
  });

  it('5.1.1 - when opening the app, should open log in page', () => {
    cy.visit('/');
    cy.location('pathname').should('eq', '/login');
    cy.get('[data-cy=username-input]').should('exist');
    cy.get('[data-cy=password-input]').should('exist');
    cy.get('[data-cy=login-btn]').should('exist');
  });

  it('5.1.2 - when trying to login with invalid credentials, should not login and give error message', () => {
    loginPage.login(INVALID_USERNAME, INVALID_PASSWORD);
    loginPage.getErrorMessage().should('exist');
  });

  it('5.1.3 - when trying to login with valid credentials, should login and redirect into the main dashboard', () => {
    cy.injectUsernameAndPasswordIntoPocketBase({
      username: VALID_USERNAME,
      password: VALID_PASSWORD,
      permission: [],
    });
    loginPage.login(VALID_USERNAME, VALID_PASSWORD);
    cy.location('pathname').should('eq', '/');
  });

  it('5.1.4 - when clicking user avatar, should open avatar preview modal', () => {
    cy.injectUsernameAndPasswordIntoPocketBase({
      username: VALID_USERNAME,
      password: VALID_PASSWORD,
      permission: ['dashboard'],
    });
    loginPage.login(VALID_USERNAME, VALID_PASSWORD);
    cy.location('pathname').should('eq', '/');
    cy.get('[data-cy=user-avatar-button]').should('be.visible').click();
    cy.get('[data-cy=avatar-modal]').should('be.visible');
    cy.get('[data-cy=close-avatar-modal]').click();
    cy.get('[data-cy=avatar-modal]').should('not.exist');
  });
});
