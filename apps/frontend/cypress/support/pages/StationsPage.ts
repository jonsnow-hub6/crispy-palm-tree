export class StationsPage {
  visit() {
    cy.visit('/stations');
  }

  getList() {
    return cy.get('[data-cy=stations-list]');
  }

  getStationItem(id: string) {
    return cy.get(`[data-cy=station-item-${id}]`);
  }

  openAddDialog() {
    cy.get('[data-cy=add-station-btn]').click();
  }
}

export default StationsPage;
