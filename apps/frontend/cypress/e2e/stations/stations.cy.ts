import DashboardPage from '../../support/pages/DashboardPage';
import PresetsPage from '../../support/pages/PresetsPage';
import StationsPage from '../../support/pages/StationsPage';
import {
  PRESETS_JSON_NAME,
  PRESETS_JSON_PRESET_NAME,
} from '../../support/consts';

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

    const stationName = 'newStation';
    const payload = {
      name: stationName,
      stationLinks: [{ host: 'localhost', port: 9090 }],
    };

    page.openCreateStationDialog();
    page.fillFields({
      name: stationName,
      host: 'localhost',
      port: '9090',
    });

    page.submitForm();
    page.assertCreateRequestPayload(payload);
  });

  it('1.1.2 - on opening app, open stations page, make sure loads stations from PocketBase into the stations page', () => {
    const seededStations = [
      {
        name: 'pb-seeded-station-1',
        stationLinks: [{ host: 'example-one', port: 8001 }],
      },
      {
        name: 'pb-seeded-station-2',
        stationLinks: [{ host: 'example-two', port: 8002 }],
      },
      {
        name: 'pb-seeded-station-3',
        stationLinks: [{ host: 'example-three', port: 8003 }],
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
    const stationName = 'mocked-station';
    page.createStationMock(stationName);
    cy.triggerProbeAllInPocketBase();
    cy.wait(1000);
    dashboardPage.visit();

    page.stopMockStationServer(stationName);
    cy.triggerProbeAllInPocketBase();
    cy.wait(1000);

    page.assertConnectedCriticalAlertVisible('No active stations detected');
  });

  it('1.2.1 - go to stations page, hover a station, should contain counter', () => {
    const stationName = 'mocked-station';
    page.createStationMock(stationName, 4000, 'localhost');
    cy.intercept('POST', '/probe-all').as('probe');

    cy.triggerProbeAllInPocketBase();
    cy.wait(1000);

    page.assertStationLinkValueExists(
      stationName,
      'localhost',
      4000,
      'Counter',
      /[0-9]+/,
    );
  });

  it('1.2.2 - go to stations page, hover a station, should contain status', () => {
    const stationName = 'mocked-station';
    page.createStationMock(stationName);

    cy.triggerProbeAllInPocketBase();

    page.assertStationLinkValueExists(
      stationName,
      'localhost',
      4000,
      'Status',
      /\bInactive\b/,
    );
  });

  it('1.2.3 - open stations page, create a station without preset, go to presets page, change the preset, make sure station synced', () => {
    const stationName = 'mocked-station';
    page.createStationMock(stationName);

    presetPage.visit();
    presetPage.importPreset(PRESETS_JSON_NAME, PRESETS_JSON_PRESET_NAME);

    dashboardPage.visit();
    dashboardPage.changeToPreset(PRESETS_JSON_PRESET_NAME);

    page.visit();
    cy.triggerProbeAllInPocketBase();
    page.assertStationLinkValueExists(
      stationName,
      'localhost',
      4000,
      'Preset',
      new RegExp(`^${PRESETS_JSON_PRESET_NAME}`, 'i'),
    );
  });

  it('1.2.4 - open stations page, when connected to a station, Activating/Deactivating should update status correctly', () => {
    const stationName = 'mocked-station';
    page.createStationMock(stationName);

    page.activateStation(stationName);
    cy.triggerProbeAllInPocketBase();
    page.assertStationLinkValueExists(
      stationName,
      'localhost',
      4000,
      'Status',
      /\bActive\b/,
    );

    page.deactivateStation(stationName);
    cy.triggerProbeAllInPocketBase();
    page.assertStationLinkValueExists(
      stationName,
      'localhost',
      4000,
      'Status',
      /\bInactive\b/,
    );
  });

  it('1.3.1 - when connected to two stations, when one activates and one not, when activating the second one the first one should deactivate and the second one should activate', () => {
    const firstStationName = 'mocked-station-1';
    const secondStationName = 'mocked-station-2';
    page.createStationMock(firstStationName);
    page.createStationMock(secondStationName, 4001);
    page.refresh();

    page.activateStation(firstStationName);
    cy.triggerProbeAllInPocketBase();

    page.activateStation(secondStationName);
    cy.triggerProbeAllInPocketBase();

    page.assertStationLinkValueExists(
      secondStationName,
      'localhost',
      4001,
      'Status',
      /\bActive\b/,
    );
    page.assertStationLinkValueExists(
      firstStationName,
      'localhost',
      4000,
      'Status',
      /\bInactive\b/,
    );
  });

  it('1.3.2 - when connected to multiple stations, when probing (done by n8n) should refresh data of all stations', () => {
    const firstStationName = 'mocked-station-1';
    const secondStationName = 'mocked-station-2';
    page.createStationMock(firstStationName);

    page.createStationMock(secondStationName, 4001);

    page.assertStationLinkValueExists(
      secondStationName,
      'localhost',
      4001,
      'status',
      /\bInactive\b/,
    );
    page.assertStationLinkValueExists(
      firstStationName,
      'localhost',
      4000,
      'status',
      /\bInactive\b/,
    );

    page.activateStation(firstStationName);

    cy.triggerProbeAllInPocketBase();

    page.assertStationLinkValueExists(
      secondStationName,
      'localhost',
      4001,
      'Status',
      /\bInactive\b/,
    );
    page.assertStationLinkValueExists(
      firstStationName,
      'localhost',
      4000,
      'Status',
      /\bActive\b/,
    );
  });

  it('1.3.3 - when connected to two stations, when one activates and one not, then deactivating it, should alert critical connection error message', () => {
    const firstStationName = 'mocked-station-1';
    const secondStationName = 'mocked-station-2';

    page.createStationMock(firstStationName);
    page.createStationMock(secondStationName, 4001);
    page.refresh();

    page.activateStation(firstStationName);
    cy.triggerProbeAllInPocketBase();

    page.deactivateStation(firstStationName);
    cy.triggerProbeAllInPocketBase();

    page.assertConnectedCriticalAlertVisible('No active stations detected');
  });

  it('1.3.4 - when connected to two stations, when one activates and one not, activating the second station not through the app, should alert', () => {
    const firstStationName = 'mocked-station-1';
    const secondStationName = 'mocked-station-2';
    const secondStationPort = 4001;
    const secondStationHost = 'localhost';

    page.createStationMock(firstStationName);
    page.createStationMock(
      secondStationName,
      secondStationPort,
      secondStationHost,
    );
    page.refresh();

    page.activateStation(firstStationName);
    cy.triggerProbeAllInPocketBase();

    cy.request({
      method: 'POST',
      url: `http://${secondStationHost}:${secondStationPort}/api/setActive`,
      body: {
        active: true,
      },
    });
    cy.triggerProbeAllInPocketBase();

    page.assertConnectedCriticalAlertVisible(
      `criticalconnection${secondStationName}Station ${secondStationName} has active link while another station is active`,
    );
  });

  it('1.3.5 - when connected to a station with two links, when one activates and one not, activating the second link not through the app, should alert', () => {
    const stationName = 'mocked-station';

    const firstLinkPort = 4000;
    const firstLinkHost = 'localhost';
    const firstLinkId = `${firstLinkHost}-${firstLinkPort}`;

    const secondLinkPort = 4001;
    const secondLinkHost = 'localhost';
    const secondLinkId = `${secondLinkHost}-${secondLinkPort}`;

    page.createStationMockWithMultipleLinks(stationName, [
      { host: firstLinkHost, port: firstLinkPort, id: firstLinkId },
      { host: secondLinkHost, port: secondLinkPort, id: secondLinkId },
    ]);

    page.refresh();

    page.activateStationLink(stationName, firstLinkId);
    cy.triggerProbeAllInPocketBase();

    cy.request({
      method: 'POST',
      url: `http://${secondLinkHost}:${secondLinkPort}/api/setActive`,
      body: {
        active: true,
      },
    });
    cy.triggerProbeAllInPocketBase();

    page.assertConnectedCriticalAlertVisible(
      `criticalconnection${stationName}Station ${stationName} has multiple active links (${firstLinkHost}:${firstLinkPort}, ${secondLinkHost}:${secondLinkPort})`,
    );
  });

  it('1.3.6 - when connected to a station, when activates,the station deactivating by its own, should alert', () => {
    const stationName = 'mocked-station';

    const stationPort = 4000;
    const stationHost = 'localhost';
    page.createStationMock(stationName, stationPort, stationHost);

    page.activateStation(stationName);
    cy.triggerProbeAllInPocketBase();

    cy.request({
      method: 'POST',
      url: `http://${stationHost}:${stationPort}/api/setActive`,
      body: {
        active: false,
      },
    });
    cy.triggerProbeAllInPocketBase();

    page.assertConnectedCriticalAlertVisible(
      `criticalconnection${stationName}Active station ${stationName} has no active links`,
    );
    page.assertConnectedCriticalAlertVisible('No active stations detected');
  });

  it('1.3.7 - when connected to a station, when activates,and link gets disconnected, should alert', () => {
    const stationName = 'mocked-station';

    const stationPort = 4000;
    const stationHost = 'localhost';
    page.createStationMock(stationName, stationPort, stationHost);

    page.activateStation(stationName);
    cy.triggerProbeAllInPocketBase();

    page.stopMockStationServer(stationName);
    cy.triggerProbeAllInPocketBase();

    page.assertStationIsUnreachableActive(stationName);
  });

  it('1.3.8 - when connected to a station with two links, should be able to activate specific link', () => {
    const stationName = 'mocked-station';

    const firstLinkPort = 4000;
    const firstLinkHost = 'localhost';
    const firstLinkId = `${firstLinkHost}-${firstLinkPort}`;

    const secondLinkPort = 4001;
    const secondLinkHost = 'localhost';
    const secondLinkId = `${secondLinkHost}-${secondLinkPort}`;

    page.createStationMockWithMultipleLinks(stationName, [
      { host: firstLinkHost, port: firstLinkPort, id: firstLinkId },
      { host: secondLinkHost, port: secondLinkPort, id: secondLinkId },
    ]);

    page.refresh();

    page.activateStationLink(stationName, firstLinkId);
    cy.triggerProbeAllInPocketBase();
  });
});
