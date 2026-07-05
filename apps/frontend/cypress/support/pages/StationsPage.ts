import {
  assertStationCreatePayload,
  interceptStationCreate,
  seedStationsInPocketBase,
  triggerStationProbeInPocketBase,
} from '../utils/stations';
import { StationValues } from '../utils/types';
import 'cypress-real-events/support';

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
    // [data-cy="station-link-pb-seeded-station-1-example-one-8001"]
    // in station-item-pb-seeded-station-1
    // cy.contains('[data-cy^="station-item-"]', name)
    //   .find('[data-cy="station-link-hover-target"]')
    //   .first()
    //   .trigger('mouseover', { force: true });

    this.assertStationLinkValueExists(
      name,
      stationLink.host,
      stationLink.port,
      'host',
      new RegExp(`^${stationLink.host}`, 'i'),
    );
    this.assertStationLinkValueExists(
      name,
      stationLink.host,
      stationLink.port,
      'port',
      new RegExp(`^${stationLink.port}`, 'i'),
    );

    // IP:localhost
    // Port:4000
    // Status:Inactive
    // Counter:49
    // Preset:unknown
  }

  // assertStationLinkValue(
  //   stationLink: StationValues,
  //   name: keyof StationValues,
  //   label: string,
  // ) {
  //   if (stationLink[name]) {
  //     cy.contains(`${label}:`, { timeout: 3000 }).should('be.visible');
  //     cy.contains(`${stationLink[name]}`).should('be.visible');
  //   }
  // }

  assertStationLinkValueExists(
    name: string,
    host: string,
    port: number,
    label: string,
    regex?: RegExp,
  ) {
    const linkSelector = `[data-cy="station-link-${name}-${host}-${port}"]`;

    // Read the data directly from DOM data-* attributes.
    // No hover needed — link values are rendered as data-link-* attributes
    // on the wrapper element by StationGraph, making this immune to
    // tooltip timing, hover mechanics, and event delegation quirks.
    const attrName = `data-link-${label.toLowerCase()}`;

    cy.get(linkSelector, { timeout: 3000 })
      .should('exist')
      .and(($el) => {
        const value = $el.attr(attrName);
        expect(value, `${label} attribute should exist`).to.not.equal(
          undefined,
        );
        if (regex) {
          expect(value, `${label} value`).to.match(regex);
        }
      });
  }
  assertStationIsUnreachableActive(name: string) {
    cy.get(`[data-cy=station-${name}-unreachable-active]`).should('exist');
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
  createStationMockWithMultipleLinks(
    stationName: string,
    links: {
      host: string;
      port: number;
      id: string;
    }[],
  ) {
    const stationLinks = links.map(({ host, port, id }) => {
      cy.createMockStationServer({ port, host, id });
      return { host, port };
    });
    this.seedStationsInPocketBase([
      {
        name: stationName,
        stationLinks: stationLinks,
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
    cy.get('[data-cy=station-activation-confirm-button]', {
      timeout: 3000,
    }).click();
  }

  activateStation(name: string) {
    this.openStationMenu(name);
    this.clickMenuActivateStation(name);
    this.clickConfirmActivationButton();
  }

  activateStationLink(name: string, linkId: string) {
    cy.get(`[data-cy=station-link-btn-${name}-${linkId}]`).click({
      force: true,
    });
    this.clickConfirmActivationButton();
  }

  assertLinkIsActive(name: string, linkId: string) {
    cy.get(`[data-cy=station-link-${name}-${linkId}]`).should(
      'have.attr',
      'aria-pressed',
      'true',
    );
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
