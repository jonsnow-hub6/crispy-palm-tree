import DashboardPage from '../../support/pages/DashboardPage';

describe('Dashboard', () => {
  const page = new DashboardPage();

  beforeEach(() => {
    cy.mockApi();
    cy.login();
    page.visit();
  });

  it('renders after login', () => {
    cy.get('nav').should('exist');
    page.getKeyWidget().should('exist');
  });
});
