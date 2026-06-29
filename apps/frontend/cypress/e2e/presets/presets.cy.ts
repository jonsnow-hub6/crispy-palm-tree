import PresetsPage from '../../support/pages/PresetsPage';

describe('Presets', () => {
  const page = new PresetsPage();

  beforeEach(() => {
    cy.mockApi();
    cy.login();
    page.visit();
  });

  it('loads and displays presets list', () => {
    page.getList().should('exist');
    page
      .getList()
      .find('[data-cy^="preset-item-"]')
      .should('have.length.greaterThan', 0);
  });
});
