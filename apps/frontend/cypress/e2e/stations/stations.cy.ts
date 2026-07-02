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

  afterEach(() => {
    cy.stopAllMockStationServers();
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
        stationLinks: [{ host: 'example-one.local', port: 8001 }],
      },
      {
        name: 'pb-seeded-station-2',
        stationLinks: [{ host: 'example-two.local', port: 8002 }],
      },
      {
        name: 'pb-seeded-station-3',
        stationLinks: [{ host: 'example-three.local', port: 8003 }],
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
    page.createStationMock(stationName);

    page.triggerStationProbe();

    page.assertStationLinkValueExists(stationName, 'Counter', /[0-9]+/);
  });

  it('1.2.2 when connected to a station, GET request for current status should work', () => {
    const stationName = 'mocked-station';
    page.createStationMock(stationName);

    page.triggerStationProbe();

    page.assertStationLinkValueExists(stationName, 'Status', /\bInactive\b/);
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
      'Preset',
      new RegExp(`^${PRESETS_JSON_PRESET_NAME}`, 'i'),
    );
  });

  it('1.2.4 when connected to a station, Activating/Deactivating should update status correctly', () => {
    const stationName = 'mocked-station';
    page.createStationMock(stationName);

    page.activateStation(stationName);
    page.triggerStationProbe();
    page.assertStationLinkValueExists(stationName, 'Status', /\bActive\b/);

    page.deactivateStation(stationName);
    page.triggerStationProbe();
    page.assertStationLinkValueExists(stationName, 'Status', /\bInactive\b/);
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
      'Status',
      /\bActive\b/,
    );
    page.assertStationLinkValueExists(
      firstStationName,
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
      'Status',
      /\bInactive\b/,
    );
    page.assertStationLinkValueExists(
      firstStationName,
      'Status',
      /\bInactive\b/,
    );

    page.activateStation(firstStationName);

    page.triggerStationProbe();

    page.assertStationLinkValueExists(
      secondStationName,
      'Status',
      /\bActive\b/,
    );
    page.assertStationLinkValueExists(
      firstStationName,
      'Status',
      /\bInactive\b/,
    );
  });

  it('1.3.3 when connected to two stations, when one activates and one not, then deactivating it, should alert critical connection error message', () => {
    const firstStationName = 'mocked-station-1';
    const secondStationName = 'mocked-station-2';
    page.createStationMock(firstStationName);
    page.createStationMock(secondStationName, 4001);
    page.refresh();

    page.activateStation(firstStationName);

    page.deactivateStation(firstStationName);
    page.refresh();

    page.triggerStationProbe();

    page.assertConnectedCriticalAlertVisible('No active stations detected');

    // page.assertStationLinkValueExists(firstStationName,'Status', /\bInactive\b/)

    // page.assertStationLinkValueExists(secondStationName,'Status', /\bInactive\b/)
    // page.assertStationLinkValueExists(firstStationName,'Status', /\bInactive\b/)
  });
});
