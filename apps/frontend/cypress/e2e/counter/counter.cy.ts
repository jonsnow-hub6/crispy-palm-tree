import StationsPage from '../../support/pages/StationsPage';
import {
  EXAMPLE_STATION_NAME,
  SECOND_EXAMPLE_STATION_NAME,
  STATION_LINK_1,
  STATION_LINK_2,
} from '../stations/consts';

describe('Counter', () => {
  const stationsPage = new StationsPage();

  beforeEach(() => {
    cy.resetDB();
    cy.killAllMockStationsLinkTcpServers();
    cy.login();
    stationsPage.visit();
  });

  it('3.1.1 - when connected to a station, counter should increase over time', () => {
    stationsPage.createStationMock({
      name: EXAMPLE_STATION_NAME,
      stationLinks: [STATION_LINK_1],
    });

    cy.triggerProbeAllInPocketBase();

    stationsPage.sendSetCounterRequestToStationLink(STATION_LINK_1, 1);

    cy.triggerProbeAllInPocketBase();

    cy.refresh();

    stationsPage.assertCounterIncreasing(EXAMPLE_STATION_NAME, STATION_LINK_1);
  });

  it('3.1.2 - when connected to a station, then activating the station, the station counter should be the same as the link counter', () => {
    stationsPage.createStationMock({
      name: EXAMPLE_STATION_NAME,
      stationLinks: [STATION_LINK_1],
    });

    stationsPage.activateStationLink(EXAMPLE_STATION_NAME, STATION_LINK_1);

    cy.triggerProbeAllInPocketBase();

    cy.refresh();

    cy.wait(1000);
    stationsPage.assertCounterIncreasing(EXAMPLE_STATION_NAME, STATION_LINK_1);

    stationsPage
      .getStationLinkValue(EXAMPLE_STATION_NAME, STATION_LINK_1, 'Counter')
      .then((linkCounterValue) => {
        stationsPage
          .getCounterVariableFromStation(EXAMPLE_STATION_NAME)
          .should('equal', linkCounterValue);
      });
  });

  it('3.2.1 - when connected to two stations, and their counters do not match, should receive a warning alert', () => {
    stationsPage.createStationMock({
      name: EXAMPLE_STATION_NAME,
      stationLinks: [STATION_LINK_1],
    });

    stationsPage.createStationMock({
      name: SECOND_EXAMPLE_STATION_NAME,
      stationLinks: [STATION_LINK_2],
    });

    stationsPage.sendSetCounterRequestToStationLink(STATION_LINK_1, 999);

    stationsPage.sendSetCounterRequestToStationLink(STATION_LINK_2, 1);

    cy.triggerProbeAllInPocketBase();
    cy.refresh();

    stationsPage.assertStationVisible(EXAMPLE_STATION_NAME);
    stationsPage.assertStationVisible(SECOND_EXAMPLE_STATION_NAME);

    cy.triggerProbeAllInPocketBase();

    stationsPage.assertAlertVisible(
      'counter',
      'warning',
      'Global counter mismatch detected across stations',
    );
  });

  it('3.2.2 - when connected to two stations, and their counters do not match, should receive a warning alert, then if the stations sync, should receive notification that the stations are synced', () => {
    stationsPage.createStationMock({
      name: EXAMPLE_STATION_NAME,
      stationLinks: [STATION_LINK_1],
    });

    stationsPage.createStationMock({
      name: SECOND_EXAMPLE_STATION_NAME,
      stationLinks: [STATION_LINK_2],
    });

    stationsPage.sendSetCounterRequestToStationLink(STATION_LINK_1, 999);

    stationsPage.sendSetCounterRequestToStationLink(STATION_LINK_2, 1);

    cy.triggerProbeAllInPocketBase();
    cy.refresh();
    cy.wait(1000);

    stationsPage.assertStationVisible(EXAMPLE_STATION_NAME);
    stationsPage.assertStationVisible(SECOND_EXAMPLE_STATION_NAME);

    cy.triggerProbeAllInPocketBase();

    stationsPage.assertAlertVisible(
      'counter',
      'warning',
      'Global counter mismatch detected across stations',
    );

    cy.refresh();
    cy.wait(1000);

    stationsPage.sendSetCounterRequestToStationLink(STATION_LINK_1, 1);

    stationsPage.sendSetCounterRequestToStationLink(STATION_LINK_2, 1);

    cy.triggerProbeAllInPocketBase();

    stationsPage.assertAlertVisible(
      'counter',
      'info',
      'Global counters are matching across stations',
    );
  });

  it('3.2.3 - when connected to a station, if the counter has decreased instead of increase, should get error alert', () => {
    stationsPage.createStationMock({
      name: EXAMPLE_STATION_NAME,
      stationLinks: [STATION_LINK_1],
    });

    stationsPage.sendSetCounterRequestToStationLink(STATION_LINK_1, 999);

    cy.triggerProbeAllInPocketBase();
    cy.refresh();
    stationsPage.assertStationVisible(EXAMPLE_STATION_NAME);

    stationsPage.sendSetCounterRequestToStationLink(STATION_LINK_1, 1);

    cy.triggerProbeAllInPocketBase();

    stationsPage.assertAlertVisible(
      'counter',
      'error',
      'Counter did not increase on at least one link',
    );
  });
});
