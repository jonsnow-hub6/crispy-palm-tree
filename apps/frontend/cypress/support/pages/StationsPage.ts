import {
  assertStationCreatePayload,
  interceptStationCreate,
  seedStationsInPocketBase,
  triggerStationProbeInPocketBase,
} from '../utils/stations';

export class StationsPage {
  visit() {
    cy.visit('/stations');
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

  assertStationLinkValues(
    name: string,
    stationLinks: Array<{ host: string; port: number }>,
  ) {
    this.assertStationVisible(name);

    cy.contains('[data-cy^="station-item-"]', name)
      .find('[data-cy="station-link-hover-target"]')
      .first()
      .trigger('mouseover', { force: true });

    cy.contains('IP:', { timeout: 10000 }).should('be.visible');
    cy.contains(`${stationLinks[0].host}`).should('be.visible');
    cy.contains(`${stationLinks[0].port}`).should('be.visible');
  }

  startMockStationServer(port: number, host: string) {
    cy.task('startMockStationServer', { port, host });
  }

  stopMockStationServer() {
    cy.task('stopMockStationServer');
  }

  createStationMock(
    stationName: string,
    port: number = 4000,
    host: string = 'localhost',
  ) {
    this.startMockStationServer(port, host);
    this.seedStationsInPocketBase([
      {
        name: stationName,
        stationLinks: [{ host: host, port: port }],
      },
    ]);
  }

  triggerStationProbe() {
    triggerStationProbeInPocketBase();
  }

  assertDisconnectAlertVisible() {
    cy.get('[data-cy^="notification-connection-critical"]', { timeout: 3000 })
      .should('be.visible')
      .should('contain.text', 'No active stations detected');
  }

  submitForm() {
    cy.submitSchemaForm();
  }
}

export default StationsPage;
