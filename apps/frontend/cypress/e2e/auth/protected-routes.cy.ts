import LoginPage from '../../support/pages/LoginPage';
import {
  VALID_USERNAME,
  VALID_PASSWORD,
  STATION_PAGE_PATH,
  LOGIN_PAGE_PATH,
} from './consts';

describe('Auth - Protected Routes', () => {
  const loginPage = new LoginPage();

  beforeEach(() => {
    loginPage.visit();
  });

  it('5.2.1 - when not logged in, should redirect unauthenticated user to /login', () => {
    cy.visit(STATION_PAGE_PATH);
    cy.location('pathname').should('eq', LOGIN_PAGE_PATH);
  });

  it('5.2.2 - when user authenticates with right permissions, should allow authenticated user to access protected routes', () => {
    cy.login();
    cy.visit(STATION_PAGE_PATH);
    cy.location('pathname').should('eq', STATION_PAGE_PATH);
  });

  it('5.2.3 - when user has permission for some of the pages, should not allow user to access routes that he does not have permissions too', () => {
    cy.injectUsernameAndPasswordIntoPocketBase({
      username: VALID_USERNAME,
      password: VALID_PASSWORD,
      permission: ['dashboard'],
    }).then(() => {
      cy.login(VALID_USERNAME, VALID_PASSWORD, ['dashboard']);
      cy.visit(STATION_PAGE_PATH);
      cy.location('pathname').should('eq', '/');
    });
  });
});
