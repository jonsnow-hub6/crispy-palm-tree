import {
  PRESETS_JSON_NAME,
  PRESETS_JSON_PRESET_NAME,
} from '../../support/consts';
import DashboardPage from '../../support/pages/DashboardPage';
import PresetsPage from '../../support/pages/PresetsPage';
import StationsPage from '../../support/pages/StationsPage';

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
      new RegExp(`^${newColor}`, 'i'),
    );
    // page.submitForm();
    // page.assertCreateRequestPayload(payload);
  });

  it('2.1.3 - set existing preset as activated preset in mainDashboard', () => {
    page.importPreset(PRESETS_JSON_NAME, PRESETS_JSON_PRESET_NAME);

    page.validatePresetExists(PRESETS_JSON_PRESET_NAME);

    dashboardPage.visit();
    dashboardPage.changeToPreset(PRESETS_JSON_PRESET_NAME);
  });

  it('2.2.1 - set a preset to a station, add a new station, sync the specific station.', () => {
    const firstStationName = 'mocked-station-1';
    const secondStationName = 'mocked-station-2';

    stationsPage.visit();

    stationsPage.createStationMock(firstStationName);
    cy.triggerProbeAllInPocketBase();

    page.visit();
    page.importPreset(PRESETS_JSON_NAME, PRESETS_JSON_PRESET_NAME);

    page.validatePresetExists(PRESETS_JSON_PRESET_NAME);

    dashboardPage.visit();
    dashboardPage.changeToPreset(PRESETS_JSON_PRESET_NAME);
    cy.triggerProbeAllInPocketBase();

    stationsPage.visit();
    stationsPage.createStationMock(secondStationName, 4001);
    cy.triggerProbeAllInPocketBase();

    stationsPage.assertStationLinkValueExists(
      secondStationName,
      'localhost',
      4001,
      'out-of-sync',
      new RegExp(`^${true}`, 'i'),
    );
    stationsPage.pressStationLinkSyncButton(
      secondStationName,
      'localhost',
      4001,
    );

    cy.triggerProbeAllInPocketBase();
    stationsPage.assertStationLinkValueExists(
      secondStationName,
      'localhost',
      4001,
      'out-of-sync',
      new RegExp(`^${false}`, 'i'),
    );
  });

  it('2.2.2 - set a preset to a station, change the preset in the station through request, sync the specific station.', () => {
    const stationName = 'mocked-station-1';
    const stationHost = 'localhost';
    const stationPort = 4000;
    const newPresetName = 'newPresetName';
    const newPresetCommands = [
      { id: 'newCommand', payload: '0x00000000000002' },
    ];

    stationsPage.visit();

    stationsPage.createStationMock(stationName);
    cy.triggerProbeAllInPocketBase();

    page.visit();
    page.importPreset(PRESETS_JSON_NAME, PRESETS_JSON_PRESET_NAME);

    page.validatePresetExists(PRESETS_JSON_PRESET_NAME);

    dashboardPage.visit();
    dashboardPage.changeToPreset(PRESETS_JSON_PRESET_NAME);
    cy.triggerProbeAllInPocketBase();

    stationsPage.visit();
    cy.request({
      method: 'POST',
      url: `http://${stationHost}:${stationPort}/api/setPreset`,
      body: {
        presetName: newPresetName,
        commands: newPresetCommands,
      },
    }).then(() => {
      cy.triggerProbeAllInPocketBase();

      stationsPage.assertStationLinkValueExists(
        stationName,
        stationHost,
        stationPort,
        'out-of-sync',
        new RegExp(`^${true}`, 'i'),
      );
      stationsPage.pressStationLinkSyncButton(
        stationName,
        stationHost,
        stationPort,
      );

      cy.triggerProbeAllInPocketBase();
      stationsPage.assertStationLinkValueExists(
        stationName,
        stationHost,
        stationPort,
        'out-of-sync',
        new RegExp(`^${false}`, 'i'),
      );
    });
  });
});
