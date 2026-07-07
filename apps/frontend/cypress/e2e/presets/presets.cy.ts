import {
  PRESETS_JSON_NAME,
  PRESETS_JSON_PRESET_NAME,
} from '../../support/consts';
import DashboardPage from '../../support/pages/DashboardPage';
import PresetsPage from '../../support/pages/PresetsPage';
import StationsPage from '../../support/pages/StationsPage';
import { createStringSearchRegex } from '../../support/utils/utils';
import {
  EXAMPLE_STATION_NAME,
  SECOND_EXAMPLE_STATION_NAME,
  STATION_LINK_1,
  STATION_LINK_2,
} from '../stations/consts';

describe('Presets', () => {
  const page = new PresetsPage();
  const dashboardPage = new DashboardPage();
  const stationsPage = new StationsPage();

  beforeEach(() => {
    cy.resetDB();
    cy.stopAllMockStationServers();
    cy.login();
    page.visit();
  });

  it('2.1.1 - create new preset', () => {
    page.importPreset(PRESETS_JSON_NAME, PRESETS_JSON_PRESET_NAME);

    page.validatePresetExists(PRESETS_JSON_PRESET_NAME);
  });

  it('2.1.2 - edit existing preset', () => {
    const newName = 'test2';
    const newColor = '#ffddaa';

    page.importPreset(PRESETS_JSON_NAME, PRESETS_JSON_PRESET_NAME);

    page.validatePresetExists(PRESETS_JSON_PRESET_NAME);

    page.openEditPresetDialog(PRESETS_JSON_PRESET_NAME);

    page.fillFields({
      name: newName,
      colorStringInput: newColor,
    });
    page.submitForm();
    page.assertPresetValueExists(
      newName,
      'color',
      createStringSearchRegex(newColor),
    );
  });

  it('2.1.3 - set existing preset as activated preset in mainDashboard', () => {
    page.importPreset(PRESETS_JSON_NAME, PRESETS_JSON_PRESET_NAME);

    page.validatePresetExists(PRESETS_JSON_PRESET_NAME);

    dashboardPage.visit();
    dashboardPage.changeToPreset(PRESETS_JSON_PRESET_NAME);
  });

  it('2.2.1 - set a preset to a station, add a new station, sync the specific station.', () => {
    stationsPage.visit();

    stationsPage.createStationMock({
      name: EXAMPLE_STATION_NAME,
      stationLinks: [STATION_LINK_1],
    });
    cy.triggerProbeAllInPocketBase();

    page.visit();
    page.importPreset(PRESETS_JSON_NAME, PRESETS_JSON_PRESET_NAME);

    page.validatePresetExists(PRESETS_JSON_PRESET_NAME);

    dashboardPage.visit();
    dashboardPage.changeToPreset(PRESETS_JSON_PRESET_NAME);
    cy.triggerProbeAllInPocketBase();

    stationsPage.visit();
    stationsPage.createStationMock({
      name: SECOND_EXAMPLE_STATION_NAME,
      stationLinks: [STATION_LINK_2],
    });
    cy.triggerProbeAllInPocketBase();

    stationsPage.assertStationLinkValueExists(
      SECOND_EXAMPLE_STATION_NAME,
      STATION_LINK_2,
      'out-of-sync',
      new RegExp(`^${true}`, 'i'),
    );
    stationsPage.pressStationLinkSyncButton(
      SECOND_EXAMPLE_STATION_NAME,
      STATION_LINK_2,
    );

    cy.triggerProbeAllInPocketBase();
    stationsPage.assertStationLinkValueExists(
      SECOND_EXAMPLE_STATION_NAME,
      STATION_LINK_2,
      'out-of-sync',
      new RegExp(`^${false}`, 'i'),
    );
  });

  it('2.2.2 - set a preset to a station, change the preset in the station through request, sync the specific station.', () => {
    const newPresetName = 'newPresetName';
    const newPresetCommands = [
      { id: 'newCommand', payload: '0x00000000000002' },
    ];

    stationsPage.visit();

    stationsPage.createStationMock({
      name: EXAMPLE_STATION_NAME,
      stationLinks: [STATION_LINK_1],
    });
    cy.triggerProbeAllInPocketBase();

    page.visit();
    page.importPreset(PRESETS_JSON_NAME, PRESETS_JSON_PRESET_NAME);

    page.validatePresetExists(PRESETS_JSON_PRESET_NAME);

    dashboardPage.visit();
    dashboardPage.changeToPreset(PRESETS_JSON_PRESET_NAME);
    cy.triggerProbeAllInPocketBase();

    stationsPage
      .sendRequestToStationLink(STATION_LINK_1, '/api/setPreset', 'POST', {
        presetName: newPresetName,
        commands: newPresetCommands,
      })
      .then(() => {
        stationsPage.visit();

        cy.triggerProbeAllInPocketBase();

        stationsPage.assertStationLinkValueExists(
          EXAMPLE_STATION_NAME,
          STATION_LINK_1,
          'out-of-sync',
          new RegExp(`^${true}`, 'i'),
        );
        stationsPage.pressStationLinkSyncButton(
          EXAMPLE_STATION_NAME,
          STATION_LINK_1,
        );

        cy.triggerProbeAllInPocketBase();
        stationsPage.assertStationLinkValueExists(
          EXAMPLE_STATION_NAME,
          STATION_LINK_1,
          'out-of-sync',
          new RegExp(`^${false}`, 'i'),
        );
      });
  });
});
