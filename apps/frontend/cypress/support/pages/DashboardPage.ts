import { PRESET_CONFIRMATION_PASSWORD } from '../../e2e/presets/consts';
import { AppPage } from '../abstract/page';
import { createStringSearchRegex } from '../utils/utils';

export class DashboardPage implements AppPage {
  visit() {
    cy.visit('/');
  }

  getPresetItem(presetName: string, timeout: number = 3000) {
    return cy.get(`[data-cy=preset-item-${presetName}]`, { timeout });
  }

  clickPresetItemChange(presetName: string, timeout: number = 3000) {
    cy.get(`[data-cy=preset-change-button-${presetName}]`, { timeout }).click({
      force: true,
    });
  }

  assertPresetIsActive(presetName: string) {
    const presetSelector = `[data-cy="active-preset"]`;
    const attrName = `data-active-preset`;

    cy.get(presetSelector, { timeout: 10000 }).should(($el) => {
      const value = $el.attr(attrName);

      expect(value, `${attrName} attribute`).to.not.equal(undefined);

      expect(value!, `${attrName} value`).to.match(
        createStringSearchRegex(presetName),
      );
    });
  }

  insertPasswordIntoChangePresetDialog(password: string) {
    cy.get('[data-cy=preset-change-password]').type(password);
  }

  clickApplyPresetButton() {
    cy.get('[data-cy=submit-apply-preset]').click();
  }

  changeActivePreset(
    presetName: string,
    password: string = PRESET_CONFIRMATION_PASSWORD,
  ) {
    this.clickPresetItemChange(presetName);
    this.insertPasswordIntoChangePresetDialog(password);
    this.clickApplyPresetButton();
  }
}

export default DashboardPage;
