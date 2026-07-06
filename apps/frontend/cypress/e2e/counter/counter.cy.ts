import StationsPage from '../../support/pages/StationsPage';
import {
  EXAMPLE_STATION_NAME,
  SECOND_EXAMPLE_STATION_NAME,
  STATION_LINK_1,
  STATION_LINK_2,
} from '../stations/consts';

describe('Counter', () => {
  const page = new StationsPage();

  beforeEach(() => {
    cy.resetDB();
    cy.stopAllMockStationServers();
    cy.login();
    page.visit();
  });

  it('3.1.1 - go to stations page, make sure counter gets updated with time', () => {
    page.createStationMock({
      name: EXAMPLE_STATION_NAME,
      stationLinks: [STATION_LINK_1],
    });

    cy.triggerProbeAllInPocketBase();

    page.sendRequestToStationLink(STATION_LINK_1, '/api/setCounter', 'POST', {
      setCounter: 1,
    });

    cy.triggerProbeAllInPocketBase();

    page.refresh();

    page.assertCounterIncreasing(EXAMPLE_STATION_NAME, STATION_LINK_1);
  });

  it('3.1.2 - go to stations page, activate station, make sure counter attribute exist on station and updates correctly', () => {
    page.createStationMock({
      name: EXAMPLE_STATION_NAME,
      stationLinks: [STATION_LINK_1],
    });

    cy.triggerProbeAllInPocketBase();

    page.activateStationLink(EXAMPLE_STATION_NAME, STATION_LINK_1);

    page.assertCounterIncreasing(EXAMPLE_STATION_NAME, STATION_LINK_1);
    page
      .getStationLinkValue(EXAMPLE_STATION_NAME, STATION_LINK_1, 'Counter')
      .then((linkCounterValue) => {
        page
          .getCounterVariableFromStation(EXAMPLE_STATION_NAME)
          .should('equal', linkCounterValue);
      });
  });

  it('3.2.1 - go to stations page, add two stations, make counters mismatch, get notification of not matching counters', () => {
    page.createStationMock({
      name: EXAMPLE_STATION_NAME,
      stationLinks: [STATION_LINK_1],
    });

    page.createStationMock({
      name: SECOND_EXAMPLE_STATION_NAME,
      stationLinks: [STATION_LINK_2],
    });

    cy.triggerProbeAllInPocketBase();

    page.refresh();

    page.sendRequestToStationLink(STATION_LINK_1, '/api/setCounter', 'POST', {
      setCounter: 999,
    });

    page.sendRequestToStationLink(STATION_LINK_2, '/api/setCounter', 'POST', {
      setCounter: 1,
    });

    page.assertStationVisible(EXAMPLE_STATION_NAME);
    page.assertStationVisible(SECOND_EXAMPLE_STATION_NAME);

    cy.triggerProbeAllInPocketBase();

    page.assertAlertVisible(
      'counter',
      'warning',
      'Global counter mismatch detected across stations',
    );
  });

  it('3.2.2 - go to stations page, add two stations, make counters mismatch, get notification of not matching counters, sync counters, get notification they match', () => {
    page.createStationMock({
      name: EXAMPLE_STATION_NAME,
      stationLinks: [STATION_LINK_1],
    });

    page.createStationMock({
      name: SECOND_EXAMPLE_STATION_NAME,
      stationLinks: [STATION_LINK_2],
    });

    cy.triggerProbeAllInPocketBase();
    page.refresh();

    page.sendRequestToStationLink(STATION_LINK_1, '/api/setCounter', 'POST', {
      setCounter: 999,
    });

    page.sendRequestToStationLink(STATION_LINK_2, '/api/setCounter', 'POST', {
      setCounter: 1,
    });

    page.assertStationVisible(EXAMPLE_STATION_NAME);
    page.assertStationVisible(SECOND_EXAMPLE_STATION_NAME);

    cy.triggerProbeAllInPocketBase();

    page.assertAlertVisible(
      'counter',
      'warning',
      'Global counter mismatch detected across stations',
    );

    page.sendRequestToStationLink(STATION_LINK_1, '/api/setCounter', 'POST', {
      setCounter: 1,
    });

    page.sendRequestToStationLink(STATION_LINK_2, '/api/setCounter', 'POST', {
      setCounter: 1,
    });

    cy.triggerProbeAllInPocketBase();

    page.assertAlertVisible(
      'counter',
      'info',
      'Global counters are matching across stations',
    );
  });

  it('3.2.3 - go to stations page, add station, get counter, decrease counter value, get notification counter decreased', () => {
    page.createStationMock({
      name: EXAMPLE_STATION_NAME,
      stationLinks: [STATION_LINK_1],
    });

    cy.triggerProbeAllInPocketBase();
    page.refresh();

    page.sendRequestToStationLink(STATION_LINK_1, '/api/setCounter', 'POST', {
      setCounter: 999,
    });

    cy.triggerProbeAllInPocketBase();

    page.sendRequestToStationLink(STATION_LINK_1, '/api/setCounter', 'POST', {
      setCounter: 1,
    });

    page.assertStationVisible(EXAMPLE_STATION_NAME);

    cy.triggerProbeAllInPocketBase();

    page.assertAlertVisible(
      'counter',
      'error',
      'Counter did not increase on at least one link',
    );
  });
});
