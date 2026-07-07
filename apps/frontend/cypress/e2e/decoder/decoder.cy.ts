import { DecoderPage } from '../../support/pages/DecoderPage';
import StationsPage from '../../support/pages/StationsPage';
import PresetsPage from '../../support/pages/PresetsPage';
import DashboardPage from '../../support/pages/DashboardPage';
import {
  PRESETS_JSON_NAME,
  PRESETS_JSON_PRESET_NAME,
} from '../../support/consts';
import { EXAMPLE_STATION_NAME, STATION_LINK_1 } from '../stations/consts';
import { createStringSearchRegex } from '../../support/utils/utils';

describe('Decoder', () => {
  const page = new DecoderPage();
  const stationsPage = new StationsPage();

  beforeEach(() => {
    cy.resetDB();
    cy.stopAllMockStationServers();
    cy.login();
    page.visit();
  });

  it('4.1.1 - create a station, add a preset, sync the preset to the station, activate station, inject packets to the logger so they will match the transmitted preset. then the preset in the navbar should be green and so does the logs', () => {
    stationsPage.visit();
    stationsPage.createStationMock({
      name: EXAMPLE_STATION_NAME,
      stationLinks: [STATION_LINK_1],
    });
    cy.triggerProbeAllInPocketBase();

    const presetsPage = new PresetsPage();
    presetsPage.visit();
    presetsPage.importPreset(PRESETS_JSON_NAME, PRESETS_JSON_PRESET_NAME);

    const dashboardPage = new DashboardPage();
    dashboardPage.visit();
    dashboardPage.changeToPreset(PRESETS_JSON_PRESET_NAME);
    cy.triggerProbeAllInPocketBase();

    stationsPage.visit();

    stationsPage.activateStationLink(EXAMPLE_STATION_NAME, STATION_LINK_1);

    cy.triggerProbeAllInPocketBase();
    page.visit();
    cy.wait(1000);

    page
      .injectLeoRecord({
        projectId: 'firstCommand',
        payload: '0x00000000000001',
        decoderId: 'decoder1',
        timeOfArrival: new Date().toISOString(),
      })
      .then((response) => {
        expect(response.status).to.equal(200);

        cy.wait(1000);

        cy.contains('VERIFIED', { timeout: 10000 }).should('be.visible');

        page.getLeoLogValue(
          0,
          'status',
          createStringSearchRegex(`Preset Action #1 (Valid)`),
        );
      });
  });

  it('4.1.2 - create a station, add a preset, sync the preset to the station, activate station, inject packets to the logger so they wont match the transmitted preset. then the preset in the navbar should be red and so does the logs', () => {
    stationsPage.visit();
    stationsPage.createStationMock({
      name: EXAMPLE_STATION_NAME,
      stationLinks: [STATION_LINK_1],
    });
    cy.triggerProbeAllInPocketBase();

    const presetsPage = new PresetsPage();
    presetsPage.visit();
    presetsPage.importPreset(PRESETS_JSON_NAME, PRESETS_JSON_PRESET_NAME);

    const dashboardPage = new DashboardPage();
    dashboardPage.visit();
    dashboardPage.changeToPreset(PRESETS_JSON_PRESET_NAME);
    cy.triggerProbeAllInPocketBase();

    stationsPage.visit();

    stationsPage.activateStationLink(EXAMPLE_STATION_NAME, STATION_LINK_1);

    cy.triggerProbeAllInPocketBase();
    page.visit();
    cy.wait(1000);
    page
      .injectLeoRecord({
        projectId: 'firstCommand',
        payload: '0x00000000000002',
        decoderId: 'decoder1',
        timeOfArrival: new Date().toISOString(),
      })
      .then((response) => {
        expect(response.status).to.equal(200);

        cy.wait(1000);

        cy.contains('WAITING', { timeout: 10000 }).should('be.visible');

        page.getLeoLogValue(
          0,
          'status',
          createStringSearchRegex(`Unexpected Action: Not in preset`),
        );
      });
  });

  it.only('4.1.3 - create a station, add a preset, sync the preset to the station, activate station, set an magic number, inject packets to the logger with not matching magic ', () => {
    stationsPage.visit();
    stationsPage.createStationMock({
      name: EXAMPLE_STATION_NAME,
      stationLinks: [STATION_LINK_1],
    });
    cy.triggerProbeAllInPocketBase();

    const presetsPage = new PresetsPage();
    presetsPage.visit();
    presetsPage.importPreset(PRESETS_JSON_NAME, PRESETS_JSON_PRESET_NAME);

    const dashboardPage = new DashboardPage();
    dashboardPage.visit();
    dashboardPage.changeToPreset(PRESETS_JSON_PRESET_NAME);
    cy.triggerProbeAllInPocketBase();

    stationsPage.visit();

    stationsPage.activateStationLink(EXAMPLE_STATION_NAME, STATION_LINK_1);

    cy.triggerProbeAllInPocketBase();
    page.visit();

    cy.wait(1000);

    cy.fillSchemaFormFields({
      magic: '1234',
    });

    page
      .injectLeoRecord({
        projectId: 'firstCommand',
        payload: '0x00000000000002',
        decoderId: 'decoder1',
        timeOfArrival: new Date().toISOString(),
      })
      .then((response) => {
        expect(response.status).to.equal(200);

        cy.wait(1000);

        cy.contains('WAITING', { timeout: 10000 }).should('be.visible');

        page.getLeoLogValue(
          0,
          'magic-mismatch',
          createStringSearchRegex(`true`),
        );
      });
  });
});
