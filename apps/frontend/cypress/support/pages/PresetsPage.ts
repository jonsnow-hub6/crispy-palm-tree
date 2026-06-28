export class PresetsPage {
  visit() {
    cy.visit('/presets');
  }

  getList() {
    return cy.get('[data-cy=presets-list]');
  }

  getPresetItem(id: string) {
    return cy.get(`[data-cy=preset-item-${id}]`);
  }

  openImport() {
    cy.get('[data-cy=import-json-btn]').click();
  }
}

export default PresetsPage;
