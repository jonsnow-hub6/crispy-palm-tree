export class DashboardPage {
  visit() {
    cy.visit('/');
  }

  getKeyWidget(selector = '[data-cy=dashboard-widget]') {
    return cy.get(selector);
  }
}

export default DashboardPage;
