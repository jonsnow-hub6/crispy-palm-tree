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
import { PRESETS_JSON_NAME, PRESETS_JSON_PRESET_NAME } from './consts';

describe('Presets', () => {
  const presetsPage = new PresetsPage();
  const dashboardPage = new DashboardPage();
  const stationsPage = new StationsPage();

  beforeEach(() => {
    cy.resetDB();
    cy.killAllMockStationsLinkTcpServers();
    cy.login();
    presetsPage.visit();
  });

  it('2.1.1 - when creating a new preset, should create the preset and show in the page', () => {
    presetsPage.importPreset(PRESETS_JSON_NAME, PRESETS_JSON_PRESET_NAME);

    presetsPage.validatePresetExists(PRESETS_JSON_PRESET_NAME);
  });

  it('2.1.2 - when editing existing preset, should change the preset values correctly', () => {
    const newName = 'test2';
    const newColor = '#ffddaa';

    presetsPage.importPreset(PRESETS_JSON_NAME, PRESETS_JSON_PRESET_NAME);

    presetsPage.openEditPresetDialog(PRESETS_JSON_PRESET_NAME);

    cy.fillSchemaFormFields({
      name: newName,
      colorStringInput: newColor,
    });

    cy.submitSchemaForm();

    presetsPage.assertPresetValueExists(
      newName,
      'color',
      createStringSearchRegex(newColor),
    );
  });

  it('2.1.3 - when changing preset, should change currently selected preset to the correct preset', () => {
    presetsPage.importPreset(PRESETS_JSON_NAME, PRESETS_JSON_PRESET_NAME);

    dashboardPage.visit();

    dashboardPage.changeActivePreset(PRESETS_JSON_PRESET_NAME);

    dashboardPage.assertPresetIsActive(PRESETS_JSON_PRESET_NAME);
  });

  it('2.2.1 - when changing preset, and then creating a new station, new station should be out and sync, and when syncing the station, should no longer be out of sync', () => {
    stationsPage.visit();

    stationsPage.createStationMock({
      name: EXAMPLE_STATION_NAME,
      stationLinks: [STATION_LINK_1],
    });
    cy.triggerProbeAllInPocketBase();

    presetsPage.visit();
    presetsPage.importPreset(PRESETS_JSON_NAME, PRESETS_JSON_PRESET_NAME);

    presetsPage.validatePresetExists(PRESETS_JSON_PRESET_NAME);

    dashboardPage.visit();
    dashboardPage.changeActivePreset(PRESETS_JSON_PRESET_NAME);
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

  it('2.2.2 - when changing preset, and a station changed the preset not through the app, the station should be out of sync, and when syncing the station, should no longer be out of sync', () => {
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

    presetsPage.visit();
    presetsPage.importPreset(PRESETS_JSON_NAME, PRESETS_JSON_PRESET_NAME);

    presetsPage.validatePresetExists(PRESETS_JSON_PRESET_NAME);

    dashboardPage.visit();
    dashboardPage.changeActivePreset(PRESETS_JSON_PRESET_NAME);
    cy.triggerProbeAllInPocketBase();

    stationsPage
      .sendRequestToStationLink(STATION_LINK_1, {
        method: 'POST',
        path: '/api/setPreset',
        parameters: {
          presetName: newPresetName,
          commands: newPresetCommands,
        },
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
