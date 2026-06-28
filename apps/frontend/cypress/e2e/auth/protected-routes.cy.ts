describe('Auth - Protected Routes', () => {
  beforeEach(() => {
    cy.mockApi();
  });

  it('redirects unauthenticated user to /login', () => {
    // Ensure no auth stored
    cy.visit('/');
    cy.location('pathname').should('eq', '/login');
  });

  it('allows authenticated user to access protected routes', () => {
    // perform login via UI (uses mocked auth)
    cy.login();
    cy.visit('/stations');
    cy.location('pathname').should('eq', '/stations');
  });
});
