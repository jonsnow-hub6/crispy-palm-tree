import {
  assertStationCreatePayload,
  interceptStationCreate,
  seedStationsInPocketBase,
  triggerStationProbeInPocketBase,
} from '../utils/stations';
import { StationValues } from '../utils/types';

export class StationsPage {
  visit() {
    cy.visit('/stations');
  }

  refresh() {
    cy.reload(true);
    cy.wait(1000);
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

  seedStationsInPocketBase(
    stations: Array<{
      name: string;
      stationLinks: Array<{ host: string; port: number }>;
    }>,
  ) {
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

  assertStationLinkValues(name: string, stationLink: StationValues) {
    this.assertStationVisible(name);

    cy.contains('[data-cy^="station-item-"]', name)
      .find('[data-cy="station-link-hover-target"]')
      .first()
      .trigger('mouseover', { force: true });

    this.assertStationLinkValue(stationLink, 'host', 'IP');
    this.assertStationLinkValue(stationLink, 'port', 'Port');
    this.assertStationLinkValue(stationLink, 'counter', 'Counter');
    this.assertStationLinkValue(stationLink, 'status', 'Status');
    // Status:Inactive

    // IP:localhost
    // Port:4000
    // Status:Inactive
    // Counter:49
    // Preset:unknown
  }

  assertStationLinkValue(
    stationLink: StationValues,
    name: keyof StationValues,
    label: string,
  ) {
    if (stationLink[name]) {
      cy.contains(`${label}:`, { timeout: 3000 }).should('be.visible');
      cy.contains(`${stationLink[name]}`).should('be.visible');
    }
  }

  assertStationLinkValueExists(name: string, label: string, regex?: RegExp) {
    cy.contains('[data-cy^="station-item-"]', name)
      .find('[data-cy="station-link-hover-target"]')
      .first()
      .trigger('mouseover', { force: true });
    cy.contains(`${label}:`, { timeout: 3000 }).should('be.visible');
    cy.contains(regex ?? '', { timeout: 3000 }).should('exist');
  }

  createStationMock(
    stationName: string,
    port: number = 4000,
    host: string = 'localhost',
  ) {
    cy.createMockStationServer({ port, host, id: stationName });
    this.seedStationsInPocketBase([
      {
        name: stationName,
        stationLinks: [{ host: host, port: port }],
      },
    ]);
    this.assertStationVisible(stationName);
  }

  stopMockStationServer(id: string) {
    cy.stopMockStationServer(id);
  }

  triggerStationProbe() {
    triggerStationProbeInPocketBase();
  }

  assertConnectedCriticalAlertVisible(
    expectedText: string = 'No active stations detected',
  ) {
    cy.get('[data-cy^="notification-connection-critical"]', { timeout: 3000 })
      .should('be.visible')
      .should('contain.text', expectedText);
  }

  openStationMenu(name: string) {
    cy.get(`[data-cy=station-menu-button-${name}]`).click({ force: true });
  }

  clickMenuActivateStation(name: string) {
    cy.get(`[data-cy=station-menu-activate-button-${name}]`).click({
      force: true,
    });
  }

  clickMenuDeactivateStation(name: string) {
    cy.get(`[data-cy=station-menu-deactivate-button-${name}]`).click({
      force: true,
    });
  }

  clickConfirmActivationButton() {
    cy.get('[data-cy=station-activation-confirm-button]').click();
  }

  activateStation(name: string) {
    this.openStationMenu(name);
    this.clickMenuActivateStation(name);
    this.clickConfirmActivationButton();
  }

  deactivateStation(name: string) {
    this.openStationMenu(name);
    this.clickMenuDeactivateStation(name);
  }

  submitForm() {
    cy.submitSchemaForm();
  }
}

export default StationsPage;
