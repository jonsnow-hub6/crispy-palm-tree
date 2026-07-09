import { PRESET_CONFIRMATION_PASSWORD } from '../../e2e/presets/consts';

export class DashboardPage {
  visit() {
    cy.visit('/');
  }

  getPresetItem(name: string, timeout: number = 3000) {
    return cy.get(`[data-cy=preset-item-${name}]`, { timeout });
  }

  clickPresetItemChange(name: string, timeout: number = 3000) {
    cy.get(`[data-cy=preset-change-button-${name}]`, { timeout }).click({
      force: true,
    });
  }

  insertPasswordIntoChangePresetDialog(password: string) {
    cy.get('[data-cy=preset-change-password]').type(password);
  }

  clickApplyPresetButton() {
    cy.get('[data-cy=submit-apply-preset]').click();
  }

  changeToPreset(
    name: string,
    password: string = PRESET_CONFIRMATION_PASSWORD,
  ) {
    this.clickPresetItemChange(name);
    this.insertPasswordIntoChangePresetDialog(password);
    this.clickApplyPresetButton();
  }
}

export default DashboardPage;
