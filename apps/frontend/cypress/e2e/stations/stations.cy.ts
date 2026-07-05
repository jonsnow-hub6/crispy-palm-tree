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

  it('1.1.1 create a new station', () => {
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

  it('1.1.2 loads stations from PocketBase into the stations page', () => {
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

  it('1.1.3 connects to a mocked station, then shows a disconnect alert', () => {
    const stationName = 'mocked-station';
    page.createStationMock(stationName);

    page.stopMockStationServer(stationName);
    page.triggerStationProbe();

    page.assertConnectedCriticalAlertVisible('No active stations detected');
  });

  it('1.2.1 when connected to a station, GET request for current counter should work', () => {
    const stationName = 'mocked-station';
    page.createStationMock(stationName, 4000, 'localhost');

    page.triggerStationProbe();

    page.assertStationLinkValueExists(
      stationName,
      'localhost',
      4000,
      'Counter',
      /[0-9]+/,
    );
  });

  it('1.2.2 when connected to a station, GET request for current status should work', () => {
    const stationName = 'mocked-station';
    page.createStationMock(stationName);

    page.triggerStationProbe();

    page.assertStationLinkValueExists(
      stationName,
      'localhost',
      4000,
      'Status',
      /\bInactive\b/,
    );
  });

  it('1.2.3 when doing SET request to the configuration file, station should update with correct file', () => {
    const stationName = 'mocked-station';
    page.createStationMock(stationName);

    presetPage.visit();
    presetPage.importPreset(PRESETS_JSON_NAME, PRESETS_JSON_PRESET_NAME);

    dashboardPage.visit();
    dashboardPage.changeToPreset(PRESETS_JSON_PRESET_NAME);

    page.visit();
    page.triggerStationProbe();
    page.assertStationLinkValueExists(
      stationName,
      'localhost',
      4000,
      'Preset',
      new RegExp(`^${PRESETS_JSON_PRESET_NAME}`, 'i'),
    );
  });

  it('1.2.4 when connected to a station, Activating/Deactivating should update status correctly', () => {
    const stationName = 'mocked-station';
    page.createStationMock(stationName);

    page.activateStation(stationName);
    page.triggerStationProbe();
    page.assertStationLinkValueExists(
      stationName,
      'localhost',
      4000,
      'Status',
      /\bActive\b/,
    );

    page.deactivateStation(stationName);
    page.triggerStationProbe();
    page.assertStationLinkValueExists(
      stationName,
      'localhost',
      4000,
      'Status',
      /\bInactive\b/,
    );
  });

  it('1.3.1 when connected to two stations, when one activates and one not, when activating the second one the first one should deactivate and the second one should activate', () => {
    const firstStationName = 'mocked-station-1';
    const secondStationName = 'mocked-station-2';
    page.createStationMock(firstStationName);
    page.createStationMock(secondStationName, 4001);
    page.refresh();

    page.activateStation(firstStationName);
    page.triggerStationProbe();

    page.activateStation(secondStationName);
    page.triggerStationProbe();

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

  it('1.3.2 when connected to multiple stations, when probing should refresh data of all stations', () => {
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

    page.triggerStationProbe();

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

  it('1.3.3 when connected to two stations, when one activates and one not, then deactivating it, should alert critical connection error message', () => {
    const firstStationName = 'mocked-station-1';
    const secondStationName = 'mocked-station-2';

    page.createStationMock(firstStationName);
    page.createStationMock(secondStationName, 4001);
    page.refresh();

    page.activateStation(firstStationName);
    page.triggerStationProbe();

    page.deactivateStation(firstStationName);
    page.triggerStationProbe();

    page.assertConnectedCriticalAlertVisible('No active stations detected');
  });

  it('1.3.4 when connected to two stations, when one activates and one not, activating the second station not through the app, should alert', () => {
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
    page.triggerStationProbe();

    cy.request({
      method: 'POST',
      url: `http://${secondStationHost}:${secondStationPort}/api/setActive`,
      body: {
        active: true,
      },
    });
    page.triggerStationProbe();

    page.assertConnectedCriticalAlertVisible(
      `criticalconnection${secondStationName}Station ${secondStationName} has active link while another station is active`,
    );
  });

  it('1.3.5 when connected to a station with two links, when one activates and one not, activating the second link not through the app, should alert', () => {
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
    page.triggerStationProbe();

    cy.request({
      method: 'POST',
      url: `http://${secondLinkHost}:${secondLinkPort}/api/setActive`,
      body: {
        active: true,
      },
    });
    page.triggerStationProbe();

    page.assertConnectedCriticalAlertVisible(
      `criticalconnection${stationName}Station ${stationName} has multiple active links (${firstLinkHost}:${firstLinkPort}, ${secondLinkHost}:${secondLinkPort})`,
    );
  });

  it('1.3.6 when connected to a station, when activates,the station deactivating by its own, should alert', () => {
    const stationName = 'mocked-station';

    const stationPort = 4000;
    const stationHost = 'localhost';
    page.createStationMock(stationName, stationPort, stationHost);

    page.activateStation(stationName);
    page.triggerStationProbe();

    cy.request({
      method: 'POST',
      url: `http://${stationHost}:${stationPort}/api/setActive`,
      body: {
        active: false,
      },
    });
    page.triggerStationProbe();

    page.assertConnectedCriticalAlertVisible(
      `criticalconnection${stationName}Active station ${stationName} has no active links`,
    );
    page.assertConnectedCriticalAlertVisible('No active stations detected');
  });

  it('1.3.7  when connected to a station, when activates,and link gets disconnected, should alert', () => {
    const stationName = 'mocked-station';

    const stationPort = 4000;
    const stationHost = 'localhost';
    page.createStationMock(stationName, stationPort, stationHost);

    page.activateStation(stationName);
    page.triggerStationProbe();

    page.stopMockStationServer(stationName);
    page.triggerStationProbe();

    page.assertStationIsUnreachableActive(stationName);
  });

  it('1.3.8  when connected to a station with two links, should be able to activate specific link', () => {
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
    page.triggerStationProbe();
  });
});
