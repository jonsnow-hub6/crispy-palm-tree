import DashboardPage from '../../support/pages/DashboardPage';
import PresetsPage from '../../support/pages/PresetsPage';
import StationsPage from '../../support/pages/StationsPage';
import {
  EXAMPLE_STATION_NAME,
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
});
