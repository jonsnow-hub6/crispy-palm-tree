import { Station, StationLink } from '../types';
import {
  assertStationCreatePayload,
  interceptStationCreate,
  seedStationsInPocketBase,
} from '../utils/stations';

export class StationsPage {
  visit() {
    cy.visit('/stations');
  }

  refresh() {
    cy.reload(true);
  }

  getList() {
    return cy.get('[data-cy=stations-list]');
  }

  getStationItem(id: string) {
    return cy.get(`[data-cy=station-item-${id}]`);
  }

  getForm() {
    return cy.get('[data-cy=schema-form]');
  }

  openCreateStationDialog() {
    cy.get('[data-cy=add-station-button]').click({ force: true });
    this.getForm().should('be.visible');
  }

  interceptCreateRequest() {
    interceptStationCreate();
  }

  assertCreateRequestPayload(expectedValues: Record<string, unknown>) {
    assertStationCreatePayload(expectedValues);
  }

  seedStationsInPocketBase(stations: Station[]) {
    seedStationsInPocketBase(stations);
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

    // IP:localhost
    // Port:4000
    // Status:Inactive
    // Counter:49
    // Preset:unknown
  }

  assertStationLinkValueExists(
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
      cy.createMockStationServer({ port, host, id });
    });
    this.seedStationsInPocketBase([
      {
        name,
        stationLinks,
      },
    ]);
    this.assertStationVisible(name);
  }

  stopMockStationLinkServer(stationName: string) {
    cy.stopMockStationServer(stationName);
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
    }).click();
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
        const initialValue = Number(initial);

        const check = (): Cypress.Chainable<void> => {
          cy.triggerProbeAllInPocketBase();
          return this.getStationLinkValue(
            stationName,
            stationLink,
            'Counter',
          ).then((current) => {
            const currentValue = Number(current);

            if (currentValue > initialValue) {
              expect(currentValue).to.be.greaterThan(initialValue);
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
    path: string,
    method: string,
    body: object,
  ) {
    return cy.request({
      method: method,
      url: `http://${host}:${port}${path}`,
      body: body,
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

  assertAlertVisible(type: string, level: string, expectedText: string) {
    cy.get(`[data-cy^="notification-${type}-${level}"]`, { timeout: 3000 })
      .should('be.visible')
      .should('contain.text', expectedText);
  }
}

export default StationsPage;
