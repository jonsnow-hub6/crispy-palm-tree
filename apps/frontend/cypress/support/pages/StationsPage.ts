import { AppPage } from '../abstract/page';
import {
  PresetCommand,
  Station,
  StationLink,
  StationLinkRequest,
} from '../types';
import {
  assertStationCreatePayload,
  interceptStationCreate,
  seedStationsInPocketBase,
} from '../utils/stations';
import { createStringSearchRegex } from '../utils/utils';

export class StationsPage implements AppPage {
  visit() {
    cy.visit('/stations');
  }

  getStationsList() {
    return cy.get('[data-cy=stations-list]');
  }

  getStationItem(id: string) {
    return cy.get(`[data-cy=station-item-${id}]`);
  }

  openCreateStationDialog() {
    cy.get('[data-cy=add-station-button]').click({ force: true });
    cy.get('[data-cy=schema-form]').should('be.visible');
  }

  interceptCreateRequest() {
    interceptStationCreate();
  }

  interceptCreateStationRequestPayload(
    expectedValues: Record<string, unknown>,
  ) {
    assertStationCreatePayload(expectedValues);
  }

  assertStationVisible(name: string) {
    cy.contains(name, { timeout: 3000 }).should('be.visible');
  }

  assertStationLinkValues(stationName: string, stationLink: StationLink) {
    this.assertStationVisible(stationName);

    this.assertStationLinkValueExists(
      stationName,
      stationLink,
      'host',
      new RegExp(`^${stationLink.host}`, 'i'),
    );
    this.assertStationLinkValueExists(
      stationName,
      stationLink,
      'port',
      new RegExp(`^${stationLink.port}`, 'i'),
    );
  }

  private assertStationLinkValueExists(
    stationName: string,
    { host, port }: StationLink,
    label: string,
    regex?: RegExp,
  ) {
    const linkSelector = `[data-cy="station-link-${stationName}-${host}-${port}"]`;
    const attrName = `data-link-${label.toLowerCase()}`;
    cy.get(linkSelector, { timeout: 10000 }).should(($el) => {
      const value = $el.attr(attrName);

      expect(value, `${label} attribute`).to.not.equal(undefined);

      if (regex) {
        expect(value!, `${label} value`).to.match(regex);
      }
    });
  }

  assertStationLinkCounterValueExists(stationName: string, link: StationLink) {
    this.assertStationLinkValueExists(stationName, link, 'Counter', /[0-9]+/);
  }
  assertStationLinkStatusValue(
    stationName: string,
    link: StationLink,
    value?: string,
  ) {
    this.assertStationLinkValueExists(
      stationName,
      link,
      'Status',
      value ? createStringSearchRegex(value) : /^[\s\S]+$/,
    );
  }

  assertStationLinkPresetValue(
    stationName: string,
    link: StationLink,
    value: string,
  ) {
    this.assertStationLinkValueExists(
      stationName,
      link,
      'Preset',
      createStringSearchRegex(value),
    );
  }

  assertStationLinkOutOfSyncValue(
    stationName: string,
    link: StationLink,
    value: boolean,
  ) {
    this.assertStationLinkValueExists(
      stationName,
      link,
      'out-of-sync',
      new RegExp(`^${value}`, 'i'),
    );
  }

  getStationLinkValue(
    stationName: string,
    { host, port }: StationLink,
    label: string,
    regex?: RegExp,
  ): Cypress.Chainable<string> {
    const linkSelector = `[data-cy="station-link-${stationName}-${host}-${port}"]`;
    const attrName = `data-link-${label.toLowerCase()}`;

    return cy.get(linkSelector, { timeout: 10000 }).then(($el) => {
      const value = $el.attr(attrName);

      expect(value, `${label} attribute`).to.not.equal(undefined);

      if (regex) {
        expect(value!, `${label} value`).to.match(regex);
      }

      return value!;
    });
  }

  assertStationIsUnreachableActive(stationName: string) {
    cy.get(`[data-cy=station-${stationName}-unreachable-active]`).should(
      'exist',
    );
  }

  createStationMock({ name, stationLinks }: Station) {
    stationLinks.forEach(({ host, id, port }) => {
      cy.createMockStationsLinkTcpServer({ port, host, id });
    });
    seedStationsInPocketBase([
      {
        name,
        stationLinks,
      },
    ]);
    this.assertStationVisible(name);
  }

  openStationMenu(stationName: string) {
    cy.get(`[data-cy=station-menu-button-${stationName}]`).click({
      force: true,
    });
  }

  clickMenuActivateStation(stationName: string) {
    cy.get(`[data-cy=station-menu-activate-button-${stationName}]`).click({
      force: true,
    });
  }

  clickMenuDeactivateStation(stationName: string) {
    cy.get(`[data-cy=station-menu-deactivate-button-${stationName}]`).click({
      force: true,
    });
  }

  clickConfirmActivationButton() {
    cy.get('[data-cy=station-activation-confirm-button]', {
      timeout: 3000,
    }).click({ force: true });
  }

  activateStation(stationName: string) {
    this.openStationMenu(stationName);
    this.clickMenuActivateStation(stationName);
    this.clickConfirmActivationButton();
  }

  activateStationLink(stationName: string, { id }: StationLink) {
    cy.get(`[data-cy=station-link-btn-${stationName}-${id}]`).click({
      force: true,
    });
    cy.wait(500);
    this.clickConfirmActivationButton();
  }

  assertLinkIsActive(stationName: string, { id }: StationLink) {
    cy.get(`[data-cy=station-link-${stationName}-${id}]`).should(
      'have.attr',
      'aria-pressed',
      'true',
    );
  }

  deactivateStation(stationName: string) {
    this.openStationMenu(stationName);
    this.clickMenuDeactivateStation(stationName);
  }

  submitForm() {
    cy.submitSchemaForm();
  }

  hoverStationLink(stationName: string, { id }: StationLink) {
    cy.get(`[data-cy="station-link-${stationName}-${id}"]`)
      .trigger('mouseover')
      .trigger('mouseenter');
  }

  pressStationLinkSyncButton(stationName: string, stationLink: StationLink) {
    this.hoverStationLink(stationName, stationLink);

    cy.get(`[data-cy="link-sync-button-${stationLink.id}"]`, { timeout: 5000 })
      .should('be.visible')
      .click({ force: true });
  }

  assertCounterIncreasing(stationName: string, stationLink: StationLink) {
    const timeout = 5000;
    const interval = 250;
    this.getStationLinkValue(stationName, stationLink, 'Counter').then(
      (initial) => {
        const start = Date.now();
        cy.triggerProbeAllInPocketBase();
        const initialValue = isNaN(Number(initial)) ? 0 : Number(initial);

        const check = (): Cypress.Chainable<void> => {
          cy.triggerProbeAllInPocketBase();
          return this.getStationLinkValue(
            stationName,
            stationLink,
            'Counter',
          ).then((current) => {
            const currentValue = Number(current);

            if (currentValue > initialValue) {
              return;
            }

            if (Date.now() - start >= timeout) {
              throw new Error(
                `Counter did not increase within ${timeout}ms. Initial=${initialValue}, Current=${currentValue}`,
              );
            }

            return cy.wait(interval).then(check);
          });
        };

        return check();
      },
    );
  }

  sendRequestToStationLink(
    { host, port }: StationLink,
    { method, parameters, path }: StationLinkRequest,
  ) {
    return cy.request({
      method: method,
      url: `http://${host}:${port}${path}`,
      body: parameters,
    });
  }

  sendSetCounterRequestToStationLink(
    stationLink: StationLink,
    counter: number,
  ) {
    return this.sendRequestToStationLink(stationLink, {
      method: 'POST',
      path: '/api/setCounter',
      parameters: {
        setCounter: counter,
      },
    });
  }

  sendSetPresetRequestToStationLink(
    stationLink: StationLink,
    newPresetName: string,
    newPresetCommands: PresetCommand[],
  ) {
    return this.sendRequestToStationLink(stationLink, {
      method: 'POST',
      path: '/api/setPreset',
      parameters: {
        presetName: newPresetName,
        commands: newPresetCommands,
      },
    });
  }

  sendSetActiveRequestToStationLink(stationLink: StationLink, active: boolean) {
    this.sendRequestToStationLink(stationLink, {
      method: 'POST',
      path: '/api/setActive',
      parameters: {
        active,
      },
    });
  }

  getCounterVariableFromStation(stationName: string, regex?: RegExp) {
    const linkSelector = `[data-cy=station-${stationName}-counter]`;
    const attrName = `data-counter`;

    return cy.get(linkSelector, { timeout: 10000 }).then(($el) => {
      const value = $el.attr(attrName);

      expect(value, `counter attribute`).to.not.equal(undefined);

      if (regex) {
        expect(value!, `counter value`).to.match(regex);
      }

      return value!;
    });
  }

  assertAlertVisible(
    type: string,
    level: string,
    expectedText: string,
    regex: RegExp = /[\s\S]*/,
  ) {
    cy.get(`[data-cy^="notification-${type}-${level}"]`, { timeout: 3000 })
      .should('be.visible')
      .should('contain.text', expectedText)
      .should(($el) => {
        const text = $el.text();
        expect(text).to.match(regex);
      });
  }
}

export default StationsPage;
