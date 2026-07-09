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
    cy.stopAllMockStationServers();
    cy.login();
    stationsPage.visit();
  });

  it('3.1.1 - go to stations page, make sure counter gets updated with time', () => {
    stationsPage.createStationMock({
      name: EXAMPLE_STATION_NAME,
      stationLinks: [STATION_LINK_1],
    });

    cy.triggerProbeAllInPocketBase();

    stationsPage.sendRequestToStationLink(STATION_LINK_1, {
      path: '/api/setCounter',
      method: 'POST',
      parameters: {
        setCounter: 1,
      },
    });

    cy.triggerProbeAllInPocketBase();

    stationsPage.refresh();

    stationsPage.assertCounterIncreasing(EXAMPLE_STATION_NAME, STATION_LINK_1);
  });

  it('3.1.2 - go to stations page, activate station, make sure counter attribute exist on station and updates correctly', () => {
    stationsPage.createStationMock({
      name: EXAMPLE_STATION_NAME,
      stationLinks: [STATION_LINK_1],
    });

    cy.triggerProbeAllInPocketBase();

    stationsPage.activateStationLink(EXAMPLE_STATION_NAME, STATION_LINK_1);

    stationsPage.assertCounterIncreasing(EXAMPLE_STATION_NAME, STATION_LINK_1);
    stationsPage
      .getStationLinkValue(EXAMPLE_STATION_NAME, STATION_LINK_1, 'Counter')
      .then((linkCounterValue) => {
        stationsPage
          .getCounterVariableFromStation(EXAMPLE_STATION_NAME)
          .should('equal', linkCounterValue);
      });
  });

  it('3.2.1 - go to stations page, add two stations, make counters mismatch, get notification of not matching counters', () => {
    stationsPage.createStationMock({
      name: EXAMPLE_STATION_NAME,
      stationLinks: [STATION_LINK_1],
    });

    stationsPage.createStationMock({
      name: SECOND_EXAMPLE_STATION_NAME,
      stationLinks: [STATION_LINK_2],
    });

    stationsPage.sendRequestToStationLink(STATION_LINK_1, {
      path: '/api/setCounter',
      method: 'POST',
      parameters: {
        setCounter: 999,
      },
    });

    stationsPage.sendRequestToStationLink(STATION_LINK_2, {
      path: '/api/setCounter',
      method: 'POST',
      parameters: {
        setCounter: 1,
      },
    });

    cy.triggerProbeAllInPocketBase();
    stationsPage.refresh();

    stationsPage.assertStationVisible(EXAMPLE_STATION_NAME);
    stationsPage.assertStationVisible(SECOND_EXAMPLE_STATION_NAME);

    cy.triggerProbeAllInPocketBase();

    stationsPage.assertAlertVisible(
      'counter',
      'warning',
      'Global counter mismatch detected across stations',
    );
  });

  it('3.2.2 - go to stations page, add two stations, make counters mismatch, get notification of not matching counters, sync counters, get notification they match', () => {
    stationsPage.createStationMock({
      name: EXAMPLE_STATION_NAME,
      stationLinks: [STATION_LINK_1],
    });

    stationsPage.createStationMock({
      name: SECOND_EXAMPLE_STATION_NAME,
      stationLinks: [STATION_LINK_2],
    });

    stationsPage.sendRequestToStationLink(STATION_LINK_1, {
      path: '/api/setCounter',
      method: 'POST',
      parameters: {
        setCounter: 999,
      },
    });

    stationsPage.sendRequestToStationLink(STATION_LINK_2, {
      path: '/api/setCounter',
      method: 'POST',
      parameters: {
        setCounter: 1,
      },
    });

    cy.triggerProbeAllInPocketBase();
    stationsPage.refresh();

    stationsPage.assertStationVisible(EXAMPLE_STATION_NAME);
    stationsPage.assertStationVisible(SECOND_EXAMPLE_STATION_NAME);

    cy.triggerProbeAllInPocketBase();

    stationsPage.assertAlertVisible(
      'counter',
      'warning',
      'Global counter mismatch detected across stations',
    );

    stationsPage.sendRequestToStationLink(STATION_LINK_1, {
      path: '/api/setCounter',
      method: 'POST',
      parameters: {
        setCounter: 1,
      },
    });

    stationsPage.sendRequestToStationLink(STATION_LINK_2, {
      path: '/api/setCounter',
      method: 'POST',
      parameters: {
        setCounter: 1,
      },
    });

    cy.triggerProbeAllInPocketBase();

    stationsPage.assertAlertVisible(
      'counter',
      'info',
      'Global counters are matching across stations',
    );
  });

  it('3.2.3 - go to stations page, add station, get counter, decrease counter value, get notification counter decreased', () => {
    stationsPage.createStationMock({
      name: EXAMPLE_STATION_NAME,
      stationLinks: [STATION_LINK_1],
    });

    cy.triggerProbeAllInPocketBase();
    stationsPage.refresh();

    stationsPage.sendRequestToStationLink(STATION_LINK_1, {
      path: '/api/setCounter',
      method: 'POST',
      parameters: {
        setCounter: 999,
      },
    });

    cy.triggerProbeAllInPocketBase();

    stationsPage.sendRequestToStationLink(STATION_LINK_1, {
      path: '/api/setCounter',
      method: 'POST',
      parameters: {
        setCounter: 1,
      },
    });

    stationsPage.assertStationVisible(EXAMPLE_STATION_NAME);

    cy.triggerProbeAllInPocketBase();

    stationsPage.assertAlertVisible(
      'counter',
      'error',
      'Counter did not increase on at least one link',
    );
  });
});
