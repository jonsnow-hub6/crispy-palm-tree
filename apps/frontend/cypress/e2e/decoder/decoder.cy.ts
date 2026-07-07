import { DecoderPage } from '../../support/pages/DecoderPage';
import StationsPage from '../../support/pages/StationsPage';
import PresetsPage from '../../support/pages/PresetsPage';
import DashboardPage from '../../support/pages/DashboardPage';
import {
  PRESETS_JSON_NAME,
  PRESETS_JSON_PRESET_NAME,
} from '../../support/consts';
import { EXAMPLE_STATION_NAME, STATION_LINK_1 } from '../stations/consts';

describe('Decoder', () => {
  const page = new DecoderPage();
  const stationsPage = new StationsPage();

  beforeEach(() => {
    cy.resetDB();
    cy.stopAllMockStationServers();
    cy.login();
    page.visit();
  });

  it('4.1.1 - create a station, add a preset, sync the preset to the station, activate station, inject packets to the logger so they will match the transmitted preset. then the preset in the navbar should be green', () => {
    // 1. Create a station
    stationsPage.visit();
    stationsPage.createStationMock({
      name: EXAMPLE_STATION_NAME,
      stationLinks: [STATION_LINK_1],
    });
    cy.triggerProbeAllInPocketBase();

    // 2. Add a preset
    const presetsPage = new PresetsPage();
    presetsPage.visit();
    presetsPage.importPreset(PRESETS_JSON_NAME, PRESETS_JSON_PRESET_NAME);

    // 3. Sync the preset to the station
    const dashboardPage = new DashboardPage();
    dashboardPage.visit();
    dashboardPage.changeToPreset(PRESETS_JSON_PRESET_NAME);
    cy.triggerProbeAllInPocketBase();

    stationsPage.visit();
    // stationsPage.assertStationLinkValueExists(
    //   EXAMPLE_STATION_NAME,
    //   STATION_LINK_1,
    //   'out-of-sync',
    //   new RegExp(`^true`, 'i'),
    // );
    // stationsPage.pressStationLinkSyncButton(EXAMPLE_STATION_NAME, STATION_LINK_1);
    // cy.triggerProbeAllInPocketBase();
    // stationsPage.assertStationLinkValueExists(
    //   EXAMPLE_STATION_NAME,
    //   STATION_LINK_1,
    //   'out-of-sync',
    //   new RegExp(`^false`, 'i'),
    // );

    // 4. Activate station
    stationsPage.activateStationLink(EXAMPLE_STATION_NAME, STATION_LINK_1);

    // 5. Inject packets to the logger so they will match the transmitted preset
    // First, inject a rapha pllLockState record to register 'decoder1' so that the UI can select/render its logs
    // page.injectRaphaRecord('pllLockState', { pllLockState: 1 }, 'decoder1');

    // Next, inject matching packets for the preset command
    // The imported preset 'test1' command id is 'firstCommand', payload is '0x00000000000001'

    // Go to decoder page to observe
    page.visit();
    cy.wait(2000);
    page
      .injectLeoRecord({
        projectId: 'firstCommand',
        payload: '0x00000000000001',
        decoderId: 'decoder1',
        timeOfArrival: new Date().toISOString(),
      })
      .then((response) => {
        expect(response.status).to.equal(200);

        cy.wait(2000);

        // cy.triggerProbeAllInPocketBase()
        // cy.triggerProbeAllInPocketBase()

        // cy.reload();

        // 6. Then the preset in the navbar should be green (verified)
        cy.contains('VERIFIED', { timeout: 10000 }).should('be.visible');
      });
  });
});
