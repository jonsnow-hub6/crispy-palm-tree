import LoginPage from '../../support/pages/LoginPage';

describe('Auth - Login', () => {
  const page = new LoginPage();

  beforeEach(() => {
    cy.mockApi();
    page.visit();
  });

  it('shows login form', () => {
    cy.get('[data-cy=username-input]').should('exist');
    cy.get('[data-cy=password-input]').should('exist');
    cy.get('[data-cy=login-btn]').should('exist');
  });

  it('shows error on invalid credentials (mocked)', () => {
    // Override auth intercept to return 400
    cy.intercept('POST', '**/api/collections/users/auth-with-password', {
      statusCode: 400,
      body: { message: 'Invalid credentials' },
    });
    page.fillUsername('bad');
    page.fillPassword('bad');
    page.submit();
    cy.get('[data-cy=login-error]').should('exist');
  });

  it('redirects on successful login (mocked)', () => {
    page.fillUsername('testUser');
    page.fillPassword('password');
    page.submit();
    cy.location('pathname').should('eq', '/');
  });
});
