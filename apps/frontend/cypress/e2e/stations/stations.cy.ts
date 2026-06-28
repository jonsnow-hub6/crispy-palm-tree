import StationsPage from '../../support/pages/StationsPage';

describe('Stations', () => {
  const page = new StationsPage();

  beforeEach(() => {
    cy.mockApi();
    cy.login();
    page.visit();
  });

  it('loads and displays stations list', () => {
    page.getList().should('exist');
    page.getList().find('[data-cy^="station-item-"]').should('have.length.greaterThan', 0);
  });
});
