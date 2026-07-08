import {
  PRESETS_JSON_NAME,
  PRESETS_JSON_PRESET_NAME,
} from '../../e2e/presets/consts';

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
    cy.get('[data-cy=open-preset-import-input]').selectFile(
      `apps/frontend/cypress/fixtures/${fixtureName}`,
      { force: true }, // because the input is hidden
    );
  }

  submitImportPresetButton() {
    cy.get('[data-cy=submit-json-import]').click({ force: true });
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

  openPresetsMenu(name: string) {
    cy.get(`[data-cy=preset-menu-btn-${name}]`).click();
  }

  pressEditMenuButton(name: string) {
    cy.get(`[data-cy=edit-preset-btn-${name}]`).click();
  }

  openEditPresetDialog(name: string) {
    this.openPresetsMenu(name);
    this.pressEditMenuButton(name);
  }

  fillFields(parameters: Record<string, string | number>) {
    cy.fillSchemaFormFields(parameters);
  }

  fillFormField(fieldName: string, value: string | number) {
    this.fillFields({ [fieldName]: value });
  }

  assertFieldValue(fieldName: string, value: string | number) {
    cy.assertSchemaFormFieldValue(fieldName, value);
  }

  submitForm() {
    cy.submitSchemaForm();
  }

  assertPresetValueExists(name: string, label: string, regex?: RegExp) {
    const presetSelector = `[data-cy="preset-item-${name}"]`;
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
