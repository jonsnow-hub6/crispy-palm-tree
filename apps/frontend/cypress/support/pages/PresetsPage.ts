import { AppPage } from '../abstract/page';

export class PresetsPage implements AppPage {
  visit() {
    cy.visit('/presets');
  }

  getPresetItem(presetName: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get(`[data-cy=preset-item-${presetName}]`, { timeout: 3000 });
  }

  openImportNewPresetDialog() {
    cy.get('[data-cy=import-json-btn]').click({ force: true });
  }

  importJsonPresetIntoInput(fixtureName: string) {
    cy.get('[data-cy=open-preset-import-input]').selectFile(
      `apps/frontend/cypress/fixtures/${fixtureName}`,
      { force: true },
    );
  }

  clickSubmitImportPresetButton() {
    cy.get('[data-cy=submit-json-import]').click({ force: true });
  }

  validatePresetExists(presetName: string) {
    this.getPresetItem(presetName).should('be.visible');
  }

  importPreset(fixtureName: string, presetName: string) {
    this.openImportNewPresetDialog();
    this.importJsonPresetIntoInput(fixtureName);
    this.clickSubmitImportPresetButton();
    this.validatePresetExists(presetName);
  }

  openPresetMenu(presetName: string) {
    cy.get(`[data-cy=preset-menu-btn-${presetName}]`).click();
  }

  pressPresetsEditMenuButton(presetName: string) {
    cy.get(`[data-cy=edit-preset-btn-${presetName}]`).click();
  }

  openEditPresetDialog(presetName: string) {
    this.openPresetMenu(presetName);
    this.pressPresetsEditMenuButton(presetName);
  }

  assertPresetValueExists(presetName: string, label: string, regex?: RegExp) {
    const presetSelector = `[data-cy="preset-item-${presetName}"]`;
    const attrName = `data-${label.toLowerCase()}`;

    cy.get(presetSelector, { timeout: 10000 }).should(($el) => {
      const value = $el.attr(attrName);

      expect(value, `${label} attribute`).to.not.equal(undefined);

      if (regex) {
        expect(value!, `${label} value`).to.match(regex);
      }
    });
  }
}

export default PresetsPage;
