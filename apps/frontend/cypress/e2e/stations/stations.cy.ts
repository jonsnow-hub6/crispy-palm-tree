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
import { seedStationsInPocketBase } from '../../support/utils/stations';

describe('Stations', () => {
  const stationsPage = new StationsPage();
  const dashboardPage = new DashboardPage();
  const presetPage = new PresetsPage();

  beforeEach(() => {
    cy.resetDB();
    cy.killAllMockStationsLinkTcpServers();
    cy.login();
    stationsPage.visit();
  });

  it('1.1.1 - when creating a new station, should send correct fields to the backend', () => {
    stationsPage.interceptCreateRequest();

    const name = 'newStation';
    const payload = {
      name: name,
      stationLinks: [{ host: 'localhost', port: 9090 }],
    };

    stationsPage.openCreateStationDialog();
    cy.fillSchemaFormFields({
      name: name,
      host: 'localhost',
      port: '9090',
    });

    stationsPage.submitForm();
    stationsPage.assertCreateRequestPayload(payload);
  });

  it('1.1.2 - when opening the stations page, should show all stations with correct status', () => {
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

    seedStationsInPocketBase(seededStations);
    dashboardPage.visit();
    stationsPage.visit();

    stationsPage.getStationsList().should('be.visible');
    stationsPage
      .getStationsList()
      .find('[data-cy^="station-item-"]')
      .should('have.length', seededStations.length);

    seededStations.forEach(({ name, stationLinks }) => {
      stationsPage.assertStationLinkValues(name, stationLinks[0]);
    });
  });

  it.skip('1.1.3 - when connected to a station, if the station tcp connection is killed, should alert', () => {
    stationsPage.createStationMock({
      name: EXAMPLE_STATION_NAME,
      stationLinks: [STATION_LINK_1],
    });
    cy.triggerProbeAllInPocketBase();
    dashboardPage.visit();

    cy.killMockStationsLinkTcpServer(EXAMPLE_STATION_NAME);
    cy.triggerProbeAllInPocketBase();

    stationsPage.assertAlertVisible(
      'connection',
      'critical',
      'No active stations detected',
    );
  });

  it('1.2.1 - when creating a station, should have counter field', () => {
    stationsPage.createStationMock({
      name: EXAMPLE_STATION_NAME,
      stationLinks: [STATION_LINK_1],
    });
    cy.wait(2000);

    cy.triggerProbeAllInPocketBase();

    cy.refresh();

    cy.triggerProbeAllInPocketBase();

    stationsPage.assertStationLinkValueExists(
      EXAMPLE_STATION_NAME,
      STATION_LINK_1,
      'Counter',
      /[0-9]+/,
    );
  });

  it('1.2.2 - when creating a station, should have status field', () => {
    stationsPage.createStationMock({
      name: EXAMPLE_STATION_NAME,
      stationLinks: [STATION_LINK_1],
    });
    cy.wait(2000);

    cy.triggerProbeAllInPocketBase();

    cy.refresh();

    cy.triggerProbeAllInPocketBase();

    stationsPage.assertStationLinkValueExists(
      EXAMPLE_STATION_NAME,
      STATION_LINK_1,
      'Status',
      createStringSearchRegex('Inactive'),
    );
  });

  it('1.2.3 - when creating a station, then importing and setting a preset active, should update the station preset to the correct one', () => {
    stationsPage.createStationMock({
      name: EXAMPLE_STATION_NAME,
      stationLinks: [STATION_LINK_1],
    });

    presetPage.visit();
    presetPage.importPreset(PRESETS_JSON_NAME, PRESETS_JSON_PRESET_NAME);

    dashboardPage.visit();
    dashboardPage.changeActivePreset(PRESETS_JSON_PRESET_NAME);

    stationsPage.visit();
    cy.triggerProbeAllInPocketBase();
    stationsPage.assertStationLinkValueExists(
      EXAMPLE_STATION_NAME,
      STATION_LINK_1,
      'Preset',
      createStringSearchRegex(PRESETS_JSON_PRESET_NAME),
    );
  });

  it('1.2.4 - when creating a station, then activating the station, should show the station activated, and when deactivated, should show the station deactivated', () => {
    stationsPage.createStationMock({
      name: EXAMPLE_STATION_NAME,
      stationLinks: [STATION_LINK_1],
    });

    stationsPage.activateStation(EXAMPLE_STATION_NAME);
    cy.triggerProbeAllInPocketBase();
    stationsPage.assertStationLinkValueExists(
      EXAMPLE_STATION_NAME,
      STATION_LINK_1,
      'Status',
      createStringSearchRegex('Active'),
    );

    stationsPage.deactivateStation(EXAMPLE_STATION_NAME);
    cy.triggerProbeAllInPocketBase();
    stationsPage.assertStationLinkValueExists(
      EXAMPLE_STATION_NAME,
      STATION_LINK_1,
      'Status',
      createStringSearchRegex('Inactive'),
    );
  });

  it('1.3.1 - when connected to two stations, when one activates and one not, when activating the second one the first one should deactivate and the second one should activate', () => {
    stationsPage.createStationMock({
      name: EXAMPLE_STATION_NAME,
      stationLinks: [STATION_LINK_1],
    });

    stationsPage.createStationMock({
      name: SECOND_EXAMPLE_STATION_NAME,
      stationLinks: [STATION_LINK_2],
    });

    stationsPage.activateStation(EXAMPLE_STATION_NAME);
    cy.triggerProbeAllInPocketBase();

    stationsPage.activateStation(SECOND_EXAMPLE_STATION_NAME);
    cy.triggerProbeAllInPocketBase();

    cy.refresh();

    stationsPage.assertStationLinkValueExists(
      SECOND_EXAMPLE_STATION_NAME,
      STATION_LINK_2,
      'Status',
      createStringSearchRegex('Active'),
    );
    stationsPage.assertStationLinkValueExists(
      EXAMPLE_STATION_NAME,
      STATION_LINK_1,
      'Status',
      createStringSearchRegex('Inactive'),
    );
  });

  it('1.3.2 - when connected to multiple stations, when probing (done by n8n) should refresh data of all stations', () => {
    stationsPage.createStationMock({
      name: EXAMPLE_STATION_NAME,
      stationLinks: [STATION_LINK_1],
    });

    stationsPage.createStationMock({
      name: SECOND_EXAMPLE_STATION_NAME,
      stationLinks: [STATION_LINK_2],
    });

    stationsPage.assertStationLinkValueExists(
      SECOND_EXAMPLE_STATION_NAME,
      STATION_LINK_2,
      'status',
      createStringSearchRegex('Inactive'),
    );
    stationsPage.assertStationLinkValueExists(
      EXAMPLE_STATION_NAME,
      STATION_LINK_1,
      'status',
      createStringSearchRegex('Inactive'),
    );

    stationsPage.activateStation(EXAMPLE_STATION_NAME);

    cy.triggerProbeAllInPocketBase();

    stationsPage.assertStationLinkValueExists(
      SECOND_EXAMPLE_STATION_NAME,
      STATION_LINK_2,
      'Status',
      createStringSearchRegex('Inactive'),
    );
    stationsPage.assertStationLinkValueExists(
      EXAMPLE_STATION_NAME,
      STATION_LINK_1,
      'Status',
      createStringSearchRegex('Active'),
    );
  });

  it('1.3.3 - when connected to two stations, when one activates and one not, then deactivating it, should alert critical connection error message', () => {
    stationsPage.createStationMock({
      name: EXAMPLE_STATION_NAME,
      stationLinks: [STATION_LINK_1],
    });

    stationsPage.createStationMock({
      name: SECOND_EXAMPLE_STATION_NAME,
      stationLinks: [STATION_LINK_2],
    });

    stationsPage.activateStation(EXAMPLE_STATION_NAME);
    cy.triggerProbeAllInPocketBase();

    cy.refresh();

    stationsPage.deactivateStation(EXAMPLE_STATION_NAME);
    cy.triggerProbeAllInPocketBase();

    stationsPage.assertAlertVisible(
      'connection',
      'critical',
      'No active stations detected',
    );
  });

  it('1.3.4 - when connected to two stations, when one activates and one not, activating the second station not through the app, should alert', () => {
    stationsPage.createStationMock({
      name: EXAMPLE_STATION_NAME,
      stationLinks: [STATION_LINK_1],
    });

    stationsPage.createStationMock({
      name: SECOND_EXAMPLE_STATION_NAME,
      stationLinks: [STATION_LINK_2],
    });

    stationsPage.activateStation(EXAMPLE_STATION_NAME);
    cy.triggerProbeAllInPocketBase();

    cy.refresh();

    stationsPage.sendSetActiveRequestToStationLink(STATION_LINK_2, true);
    cy.wait(1000);

    cy.triggerProbeAllInPocketBase();
    const station1CriticalMessage = `criticalconnection${SECOND_EXAMPLE_STATION_NAME}Station ${SECOND_EXAMPLE_STATION_NAME} has active link while another station is active`;
    const station2CriticalMessage = `criticalconnection${EXAMPLE_STATION_NAME}Station ${EXAMPLE_STATION_NAME} has active link while another station is active`;
    stationsPage.assertAlertVisible(
      'connection',
      'critical',
      '',
      new RegExp(`${station1CriticalMessage}|${station2CriticalMessage}`),
    );
  });

  it('1.3.5 - when connected to a station with two links, when one activates and one not, activating the second link not through the app, should alert', () => {
    stationsPage.createStationMock({
      name: EXAMPLE_STATION_NAME,
      stationLinks: [STATION_LINK_1, STATION_LINK_2],
    });

    stationsPage.activateStationLink(EXAMPLE_STATION_NAME, STATION_LINK_1);
    cy.triggerProbeAllInPocketBase();
    cy.refresh();
    cy.wait(2000);

    stationsPage.sendSetActiveRequestToStationLink(STATION_LINK_2, true);
    cy.wait(2000);
    cy.triggerProbeAllInPocketBase();
    stationsPage.assertAlertVisible(
      'connection',
      'critical',
      `criticalconnection${EXAMPLE_STATION_NAME}Station ${EXAMPLE_STATION_NAME} has multiple active links (${STATION_LINK_1.host}:${STATION_LINK_1.port}, ${STATION_LINK_2.host}:${STATION_LINK_2.port})`,
    );
  });

  it('1.3.6 - when connected to a station, when activates, the station deactivating by its own, should alert', () => {
    stationsPage.createStationMock({
      name: EXAMPLE_STATION_NAME,
      stationLinks: [STATION_LINK_1],
    });

    stationsPage.activateStation(EXAMPLE_STATION_NAME);

    stationsPage.sendSetActiveRequestToStationLink(STATION_LINK_1, false);
    cy.triggerProbeAllInPocketBase();

    stationsPage.assertAlertVisible(
      'connection',
      'critical',
      `criticalconnection${EXAMPLE_STATION_NAME}Active station ${EXAMPLE_STATION_NAME} has no active links`,
    );
    stationsPage.assertAlertVisible(
      'connection',
      'critical',
      'No active stations detected',
    );
  });

  it('1.3.7 - when connected to a station, when activates, and link gets disconnected, should alert', () => {
    stationsPage.createStationMock({
      name: EXAMPLE_STATION_NAME,
      stationLinks: [STATION_LINK_1],
    });

    stationsPage.activateStation(EXAMPLE_STATION_NAME);
    cy.triggerProbeAllInPocketBase();

    cy.killMockStationsLinkTcpServer(STATION_LINK_1.id);
    cy.triggerProbeAllInPocketBase();

    stationsPage.assertStationIsUnreachableActive(EXAMPLE_STATION_NAME);
  });

  it('1.3.8 - when connected to a station with two links, should be able to activate specific link', () => {
    stationsPage.createStationMock({
      name: EXAMPLE_STATION_NAME,
      stationLinks: [STATION_LINK_1, STATION_LINK_2],
    });

    cy.refresh();

    stationsPage.activateStationLink(EXAMPLE_STATION_NAME, STATION_LINK_1);
    cy.triggerProbeAllInPocketBase();
  });
});
