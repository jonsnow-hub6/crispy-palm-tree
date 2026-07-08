import DashboardPage from '../../support/pages/DashboardPage';
import PresetsPage from '../../support/pages/PresetsPage';
import StationsPage from '../../support/pages/StationsPage';
import {
  EXAMPLE_STATION_NAME,
  SECOND_EXAMPLE_STATION_NAME,
  STATION_LINK_1,
  STATION_LINK_2,
  STATION_LINK_3,
} from './consts';
import { Station } from '../../support/types';
import { createStringSearchRegex } from '../../support/utils/utils';
import { PRESETS_JSON_NAME, PRESETS_JSON_PRESET_NAME } from '../presets/consts';

describe('Stations', () => {
  const page = new StationsPage();
  const dashboardPage = new DashboardPage();
  const presetPage = new PresetsPage();

  beforeEach(() => {
    cy.resetDB();
    cy.stopAllMockStationServers();
    cy.login();
    page.visit();
  });

  it('1.1.1 - open stations page, create a new station', () => {
    page.interceptCreateRequest();

    const name = 'newStation';
    const payload = {
      name: name,
      stationLinks: [{ host: 'localhost', port: 9090 }],
    };

    page.openCreateStationDialog();
    cy.fillSchemaFormFields({
      name: name,
      host: 'localhost',
      port: '9090',
    });

    page.submitForm();
    page.assertCreateRequestPayload(payload);
  });

  it('1.1.2 - on opening app, open stations page, make sure loads stations from PocketBase into the stations page', () => {
    const seededStations: Station[] = [
      {
        name: 'pb-seeded-station-1',
        stationLinks: [STATION_LINK_1],
      },
      {
        name: 'pb-seeded-station-2',
        stationLinks: [STATION_LINK_2],
      },
      {
        name: 'pb-seeded-station-3',
        stationLinks: [STATION_LINK_3],
      },
    ];

    page.seedStationsInPocketBase(seededStations);
    dashboardPage.visit();
    page.visit();

    page.getList().should('be.visible');
    page
      .getList()
      .find('[data-cy^="station-item-"]')
      .should('have.length', seededStations.length);

    seededStations.forEach(({ name, stationLinks }) => {
      page.assertStationLinkValues(name, stationLinks[0]);
    });
  });

  it.skip('1.1.3 - go to stations page, connect to a mocked station, go to a different page, kill station not through app, should show a disconnect alert', () => {
    page.createStationMock({
      name: EXAMPLE_STATION_NAME,
      stationLinks: [STATION_LINK_1],
    });
    cy.triggerProbeAllInPocketBase();
    dashboardPage.visit();

    page.stopMockStationLinkServer(EXAMPLE_STATION_NAME);
    cy.triggerProbeAllInPocketBase();

    page.assertAlertVisible(
      'connection',
      'critical',
      'No active stations detected',
    );
  });

  it('1.2.1 - go to stations page, hover a station, should contain counter', () => {
    page.createStationMock({
      name: EXAMPLE_STATION_NAME,
      stationLinks: [STATION_LINK_1],
    });

    page.refresh();

    cy.triggerProbeAllInPocketBase();

    page.refresh();

    page.assertStationLinkValueExists(
      EXAMPLE_STATION_NAME,
      STATION_LINK_1,
      'Counter',
      /[0-9]+/,
    );
  });

  it('1.2.2 - go to stations page, hover a station, should contain status', () => {
    page.createStationMock({
      name: EXAMPLE_STATION_NAME,
      stationLinks: [STATION_LINK_1],
    });

    page.refresh();

    cy.triggerProbeAllInPocketBase();

    page.refresh();

    page.assertStationLinkValueExists(
      EXAMPLE_STATION_NAME,
      STATION_LINK_1,
      'Status',
      createStringSearchRegex('Inactive'),
    );
  });

  it('1.2.3 - open stations page, create a station without preset, go to presets page, change the preset, make sure station synced', () => {
    page.createStationMock({
      name: EXAMPLE_STATION_NAME,
      stationLinks: [STATION_LINK_1],
    });

    presetPage.visit();
    presetPage.importPreset(PRESETS_JSON_NAME, PRESETS_JSON_PRESET_NAME);

    dashboardPage.visit();
    dashboardPage.changeToPreset(PRESETS_JSON_PRESET_NAME);

    page.visit();
    cy.triggerProbeAllInPocketBase();
    page.assertStationLinkValueExists(
      EXAMPLE_STATION_NAME,
      STATION_LINK_1,
      'Preset',
      createStringSearchRegex(PRESETS_JSON_PRESET_NAME),
    );
  });

  it('1.2.4 - open stations page, when connected to a station, Activating/Deactivating should update status correctly', () => {
    page.createStationMock({
      name: EXAMPLE_STATION_NAME,
      stationLinks: [STATION_LINK_1],
    });

    page.activateStation(EXAMPLE_STATION_NAME);
    cy.triggerProbeAllInPocketBase();
    page.assertStationLinkValueExists(
      EXAMPLE_STATION_NAME,
      STATION_LINK_1,
      'Status',
      createStringSearchRegex('Active'),
    );

    page.deactivateStation(EXAMPLE_STATION_NAME);
    cy.triggerProbeAllInPocketBase();
    page.assertStationLinkValueExists(
      EXAMPLE_STATION_NAME,
      STATION_LINK_1,
      'Status',
      createStringSearchRegex('Inactive'),
    );
  });

  it('1.3.1 - when connected to two stations, when one activates and one not, when activating the second one the first one should deactivate and the second one should activate', () => {
    page.createStationMock({
      name: EXAMPLE_STATION_NAME,
      stationLinks: [STATION_LINK_1],
    });

    page.createStationMock({
      name: SECOND_EXAMPLE_STATION_NAME,
      stationLinks: [STATION_LINK_2],
    });

    page.activateStation(EXAMPLE_STATION_NAME);
    cy.triggerProbeAllInPocketBase();

    page.activateStation(SECOND_EXAMPLE_STATION_NAME);
    cy.triggerProbeAllInPocketBase();

    page.refresh();

    page.assertStationLinkValueExists(
      SECOND_EXAMPLE_STATION_NAME,
      STATION_LINK_2,
      'Status',
      createStringSearchRegex('Active'),
    );
    page.assertStationLinkValueExists(
      EXAMPLE_STATION_NAME,
      STATION_LINK_1,
      'Status',
      createStringSearchRegex('Inactive'),
    );
  });

  it('1.3.2 - when connected to multiple stations, when probing (done by n8n) should refresh data of all stations', () => {
    page.createStationMock({
      name: EXAMPLE_STATION_NAME,
      stationLinks: [STATION_LINK_1],
    });

    page.createStationMock({
      name: SECOND_EXAMPLE_STATION_NAME,
      stationLinks: [STATION_LINK_2],
    });

    page.assertStationLinkValueExists(
      SECOND_EXAMPLE_STATION_NAME,
      STATION_LINK_2,
      'status',
      createStringSearchRegex('Inactive'),
    );
    page.assertStationLinkValueExists(
      EXAMPLE_STATION_NAME,
      STATION_LINK_1,
      'status',
      createStringSearchRegex('Inactive'),
    );

    page.activateStation(EXAMPLE_STATION_NAME);

    cy.triggerProbeAllInPocketBase();

    page.assertStationLinkValueExists(
      SECOND_EXAMPLE_STATION_NAME,
      STATION_LINK_2,
      'Status',
      createStringSearchRegex('Inactive'),
    );
    page.assertStationLinkValueExists(
      EXAMPLE_STATION_NAME,
      STATION_LINK_1,
      'Status',
      createStringSearchRegex('Active'),
    );
  });

  it('1.3.3 - when connected to two stations, when one activates and one not, then deactivating it, should alert critical connection error message', () => {
    page.createStationMock({
      name: EXAMPLE_STATION_NAME,
      stationLinks: [STATION_LINK_1],
    });

    page.createStationMock({
      name: SECOND_EXAMPLE_STATION_NAME,
      stationLinks: [STATION_LINK_2],
    });

    page.refresh();

    page.activateStation(EXAMPLE_STATION_NAME);
    cy.triggerProbeAllInPocketBase();

    page.deactivateStation(EXAMPLE_STATION_NAME);
    cy.triggerProbeAllInPocketBase();

    page.assertAlertVisible(
      'connection',
      'critical',
      'No active stations detected',
    );
  });

  it('1.3.4 - when connected to two stations, when one activates and one not, activating the second station not through the app, should alert', () => {
    page.createStationMock({
      name: EXAMPLE_STATION_NAME,
      stationLinks: [STATION_LINK_1],
    });

    page.createStationMock({
      name: SECOND_EXAMPLE_STATION_NAME,
      stationLinks: [STATION_LINK_2],
    });

    page.refresh();

    page.activateStation(EXAMPLE_STATION_NAME);
    cy.triggerProbeAllInPocketBase();
    page.sendRequestToStationLink(STATION_LINK_2, '/api/setActive', 'POST', {
      active: true,
    });

    cy.triggerProbeAllInPocketBase();

    page.assertAlertVisible(
      'connection',
      'critical',
      `criticalconnection${SECOND_EXAMPLE_STATION_NAME}Station ${SECOND_EXAMPLE_STATION_NAME} has active link while another station is active`,
    );
  });

  it('1.3.5 - when connected to a station with two links, when one activates and one not, activating the second link not through the app, should alert', () => {
    page.createStationMock({
      name: EXAMPLE_STATION_NAME,
      stationLinks: [STATION_LINK_1, STATION_LINK_2],
    });

    page.refresh();

    page.activateStationLink(EXAMPLE_STATION_NAME, STATION_LINK_1);
    cy.triggerProbeAllInPocketBase();
    page.sendRequestToStationLink(STATION_LINK_2, '/api/setActive', 'POST', {
      active: true,
    });
    cy.triggerProbeAllInPocketBase();

    page.assertAlertVisible(
      'connection',
      'critical',
      `criticalconnection${EXAMPLE_STATION_NAME}Station ${EXAMPLE_STATION_NAME} has multiple active links (${STATION_LINK_1.host}:${STATION_LINK_1.port}, ${STATION_LINK_2.host}:${STATION_LINK_2.port})`,
    );
  });

  it('1.3.6 - when connected to a station, when activates,the station deactivating by its own, should alert', () => {
    page.createStationMock({
      name: EXAMPLE_STATION_NAME,
      stationLinks: [STATION_LINK_1],
    });

    page.activateStation(EXAMPLE_STATION_NAME);
    cy.triggerProbeAllInPocketBase();

    page.sendRequestToStationLink(STATION_LINK_1, '/api/setActive', 'POST', {
      active: false,
    });

    cy.triggerProbeAllInPocketBase();

    page.assertAlertVisible(
      'connection',
      'critical',
      `criticalconnection${EXAMPLE_STATION_NAME}Active station ${EXAMPLE_STATION_NAME} has no active links`,
    );
    page.assertAlertVisible(
      'connection',
      'critical',
      'No active stations detected',
    );
  });

  it('1.3.7 - when connected to a station, when activates,and link gets disconnected, should alert', () => {
    page.createStationMock({
      name: EXAMPLE_STATION_NAME,
      stationLinks: [STATION_LINK_1],
    });

    page.activateStation(EXAMPLE_STATION_NAME);
    cy.triggerProbeAllInPocketBase();

    page.stopMockStationLinkServer(STATION_LINK_1.id);
    cy.triggerProbeAllInPocketBase();

    page.assertStationIsUnreachableActive(EXAMPLE_STATION_NAME);
  });

  it('1.3.8 - when connected to a station with two links, should be able to activate specific link', () => {
    page.createStationMock({
      name: EXAMPLE_STATION_NAME,
      stationLinks: [STATION_LINK_1, STATION_LINK_2],
    });

    page.refresh();

    page.activateStationLink(EXAMPLE_STATION_NAME, STATION_LINK_1);
    cy.triggerProbeAllInPocketBase();
  });
});
