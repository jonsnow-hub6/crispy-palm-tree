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

  it('shows login form', () => {
    cy.get('[data-cy=username-input]').should('exist');
    cy.get('[data-cy=password-input]').should('exist');
    cy.get('[data-cy=login-btn]').should('exist');
  });

  it('shows error on invalid credentials (mocked)', () => {
    loginPage.fillUsername(INVALID_USERNAME);
    loginPage.fillPassword(INVALID_PASSWORD);
    loginPage.submit();
    cy.get('[data-cy=login-error]').should('exist');
  });

  it('redirects on successful login (mocked)', () => {
    loginPage.injectValidUsernameAndPasswordToPocketBase(
      VALID_USERNAME,
      VALID_PASSWORD,
    );

    loginPage.fillUsername(VALID_USERNAME);
    loginPage.fillPassword(VALID_PASSWORD);
    loginPage.submit();
    cy.location('pathname').should('eq', '/');
  });
});
