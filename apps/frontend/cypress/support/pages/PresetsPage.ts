export class PresetsPage {
  visit() {
    cy.visit('/presets');
  }

  getPresetItem(presetName: string) {
    return cy.get(`[data-cy=preset-item-${presetName}]`, { timeout: 3000 });
  }

  openImport() {
    cy.get('[data-cy=import-json-btn]').click({ force: true });
  }

  importPresetIntoInput(fixtureName: string) {
    cy.get('[data-cy=open-preset-import-input]').selectFile(
      `apps/frontend/cypress/fixtures/${fixtureName}`,
      { force: true },
    );
  }

  submitImportPresetButton() {
    cy.get('[data-cy=submit-json-import]').click({ force: true });
  }

  validatePresetExists(presetName: string) {
    this.getPresetItem(presetName).should('be.visible');
  }

  importPreset(fixtureName: string, stationName: string) {
    this.openImport();
    this.importPresetIntoInput(fixtureName);
    this.submitImportPresetButton();
    this.validatePresetExists(stationName);
  }

  openPresetMenu(presetName: string) {
    cy.get(`[data-cy=preset-menu-btn-${presetName}]`).click();
  }

  pressEditMenuButton(presetName: string) {
    cy.get(`[data-cy=edit-preset-btn-${presetName}]`).click();
  }

  openEditPresetDialog(presetName: string) {
    this.openPresetMenu(presetName);
    this.pressEditMenuButton(presetName);
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
