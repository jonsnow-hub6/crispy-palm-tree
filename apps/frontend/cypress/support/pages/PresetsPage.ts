import { PRESETS_JSON_NAME, PRESETS_JSON_PRESET_NAME } from '../consts';

export class PresetsPage {
  visit() {
    cy.visit('/presets');
  }

  getList() {
    return cy.get('[data-cy=presets-list]');
  }

  getPresetItem(name: string, timeout: number = 3000) {
    return cy.get(`[data-cy=preset-item-${name}]`, { timeout });
  }

  openImport() {
    cy.get('[data-cy=import-json-btn]').click({ force: true });
  }

  importPresetIntoInput(fixtureName: string) {
    cy.get('[data-cy="open-preset-import-input"]').selectFile(
      `apps/frontend/cypress/fixtures/${fixtureName}`,
      { force: true }, // because the input is hidden
    );
  }

  submitImportPresetButton() {
    cy.get('[data-cy="submit-json-import"]').click({ force: true });
  }

  validatePresetExists(name: string) {
    this.getPresetItem(name).should('be.visible');
  }

  importPreset(
    fixtureName: string = PRESETS_JSON_NAME,
    stationName: string = PRESETS_JSON_PRESET_NAME,
  ) {
    this.openImport();
    this.importPresetIntoInput(fixtureName);
    this.submitImportPresetButton();
    this.validatePresetExists(stationName);
  }
}

export default PresetsPage;
