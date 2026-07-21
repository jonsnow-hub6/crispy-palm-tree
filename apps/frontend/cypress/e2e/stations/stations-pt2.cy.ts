import StationsPage from '../../support/pages/StationsPage';
import {
  EXAMPLE_STATION_NAME,
  SECOND_EXAMPLE_STATION_NAME,
  STATION_LINK_1,
  STATION_LINK_2,
} from './consts';
import { createStringSearchRegex } from '../../support/utils/utils';

describe('Stations', () => {
  const stationsPage = new StationsPage();

  beforeEach(() => {
    cy.resetDB();
    cy.killAllMockStationsLinkTcpServers();
    cy.login();
    stationsPage.visit();
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
