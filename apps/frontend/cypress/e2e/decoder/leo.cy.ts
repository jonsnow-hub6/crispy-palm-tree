import { DecoderPage } from '../../support/pages/DecoderPage';
import StationsPage from '../../support/pages/StationsPage';
import PresetsPage from '../../support/pages/PresetsPage';
import DashboardPage from '../../support/pages/DashboardPage';
import { EXAMPLE_STATION_NAME, STATION_LINK_1 } from '../stations/consts';
import { createStringSearchRegex } from '../../support/utils/utils';
import { VALID_DECODER_ID } from './consts';
import {
  FIRST_PRESET_JSON_PROJECT_ID,
  MULTIPLE_ACTIONS_PRESET_JSON_NAME,
  MULTIPLE_ACTIONS_PRESET_NAME,
  PRESET_JSON_PROJECT_ID,
  PRESETS_JSON_NAME,
  PRESETS_JSON_PRESET_NAME,
  SECOND_PRESET_JSON_PROJECT_ID,
  THIRD_PRESET_JSON_PROJECT_ID,
} from '../presets/consts';

describe('Decoder - Leo', () => {
  const page = new DecoderPage();
  const stationsPage = new StationsPage();
  const presetsPage = new PresetsPage();
  const dashboardPage = new DashboardPage();

  beforeEach(() => {
    cy.resetDB();
    cy.deleteDecoderId(VALID_DECODER_ID);
    cy.createDecoderId(VALID_DECODER_ID);
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

    presetsPage.visit();
    presetsPage.importPreset(PRESETS_JSON_NAME, PRESETS_JSON_PRESET_NAME);

    dashboardPage.visit();
    dashboardPage.changeToPreset(PRESETS_JSON_PRESET_NAME);
    cy.triggerProbeAllInPocketBase();

    stationsPage.visit();

    stationsPage.activateStationLink(EXAMPLE_STATION_NAME, STATION_LINK_1);

    const validCounter = 1;
    stationsPage.sendRequestToStationLink(
      STATION_LINK_1,
      '/api/setCounter',
      'POST',
      {
        setCounter: validCounter,
      },
    );

    // stationsPage.assertStationVisible(EXAMPLE_STATION_NAME);

    cy.triggerProbeAllInPocketBase();
    page.visit();
    page.insertLoggerValue('delta', 10);

    page.injectLeoRecords([
      {
        projectId: PRESET_JSON_PROJECT_ID,
        payload: '0x00000000000001',
        reserved: '0x00000000000001',
        counter: validCounter,
        decoderId: VALID_DECODER_ID,
        timeOfArrival: new Date().toISOString(),
      },
    ]);

    cy.contains('VERIFIED', { timeout: 10000 }).should('be.visible');

    page.getLeoLogValue(
      0,
      'status',
      createStringSearchRegex(`Preset Action #1 (Valid)`),
    );
  });

  it('4.1.2 - create a station, add a preset, sync the preset to the station, activate station, inject packets to the logger so they wont match the transmitted preset. then the preset in the navbar should be red and so does the logs', () => {
    stationsPage.visit();
    stationsPage.createStationMock({
      name: EXAMPLE_STATION_NAME,
      stationLinks: [STATION_LINK_1],
    });
    cy.triggerProbeAllInPocketBase();

    presetsPage.visit();
    presetsPage.importPreset(PRESETS_JSON_NAME, PRESETS_JSON_PRESET_NAME);

    dashboardPage.visit();
    dashboardPage.changeToPreset(PRESETS_JSON_PRESET_NAME);
    cy.triggerProbeAllInPocketBase();

    stationsPage.visit();

    stationsPage.activateStationLink(EXAMPLE_STATION_NAME, STATION_LINK_1);

    cy.triggerProbeAllInPocketBase();
    page.visit();
    page.insertLoggerValue('delta', 1);

    page.injectLeoRecords([
      {
        projectId: PRESET_JSON_PROJECT_ID,
        payload: '0x00000000000002',
        decoderId: VALID_DECODER_ID,
        timeOfArrival: new Date().toISOString(),
      },
    ]);
    cy.wait(1000);

    cy.contains('WAITING', { timeout: 10000 }).should('be.visible');

    page.getLeoLogValue(
      0,
      'status',
      createStringSearchRegex(`Unexpected Action: Not in preset`),
    );
  });

  it('4.1.3 - create a station, add a preset, sync the preset to the station, activate station, set an magic number, inject packets to the logger with not matching magic ', () => {
    stationsPage.visit();
    stationsPage.createStationMock({
      name: EXAMPLE_STATION_NAME,
      stationLinks: [STATION_LINK_1],
    });
    cy.triggerProbeAllInPocketBase();

    presetsPage.visit();
    presetsPage.importPreset(PRESETS_JSON_NAME, PRESETS_JSON_PRESET_NAME);

    dashboardPage.visit();
    dashboardPage.changeToPreset(PRESETS_JSON_PRESET_NAME);
    cy.triggerProbeAllInPocketBase();

    stationsPage.visit();

    stationsPage.activateStationLink(EXAMPLE_STATION_NAME, STATION_LINK_1);

    cy.triggerProbeAllInPocketBase();
    page.visit();

    page.insertLoggerValue('magic', 1234);

    page.injectLeoRecords([
      {
        projectId: PRESET_JSON_PROJECT_ID,
        counter: 4,
        payload: '0x00000000000001',
        timeOfArrival: new Date().toISOString(),
        reserved: '0x00000000000001',
        decoderId: VALID_DECODER_ID,
      },
    ]);

    cy.contains('WAITING', { timeout: 10000 }).should('be.visible');

    page.getLeoLogValue(0, 'magic-mismatch', createStringSearchRegex(`true`));
  });

  it('4.1.4 - create a station, add a preset, sync the preset to the station, activate station, inject packets to the logger so some match and some wont match the transmitted preset. then the preset in the navbar should be red and so does the logs', () => {
    stationsPage.visit();
    stationsPage.createStationMock({
      name: EXAMPLE_STATION_NAME,
      stationLinks: [STATION_LINK_1],
    });
    cy.triggerProbeAllInPocketBase();

    presetsPage.visit();
    presetsPage.importPreset(PRESETS_JSON_NAME, PRESETS_JSON_PRESET_NAME);

    dashboardPage.visit();
    dashboardPage.changeToPreset(PRESETS_JSON_PRESET_NAME);
    cy.triggerProbeAllInPocketBase();

    stationsPage.visit();

    stationsPage.activateStationLink(EXAMPLE_STATION_NAME, STATION_LINK_1);

    cy.triggerProbeAllInPocketBase();
    page.visit();
    page.insertLoggerValue('magic', 12345678);
    page.insertLoggerValue('delta', 10);

    page.injectLeoRecords([
      {
        projectId: PRESET_JSON_PROJECT_ID,
        payload: '0x00000000000002',
        reserved: '0x00000000000002',
        decoderId: VALID_DECODER_ID,
        counter: 1,
        timeOfArrival: new Date().toISOString(),
      },
      {
        projectId: PRESET_JSON_PROJECT_ID,
        payload: '0x00000000000001',
        reserved: '0x00000000000001',
        decoderId: VALID_DECODER_ID,
        counter: 2,
        timeOfArrival: new Date().toISOString(),
      },
      {
        projectId: PRESET_JSON_PROJECT_ID,
        payload: '0x00000000000001',
        reserved: '0x00000000000001',
        decoderId: VALID_DECODER_ID,
        counter: 3,
        timeOfArrival: new Date().toISOString(),
      },
      {
        projectId: PRESET_JSON_PROJECT_ID,
        payload: '0x00000000000002',
        reserved: '0x00000000000002',
        decoderId: VALID_DECODER_ID,
        counter: 4,
        timeOfArrival: new Date().toISOString(),
      },
    ]);

    cy.wait(1000).then(() => {
      page.getLeoLogValue(
        0,
        'status',
        createStringSearchRegex(`Unexpected Action: Not in preset`),
      );

      page.getLeoLogValue(
        1,
        'status',
        createStringSearchRegex(`Preset Action #1 (Valid)`),
      );

      page.getLeoLogValue(
        2,
        'status',
        createStringSearchRegex(`Preset Action #1 (Valid)`),
      );

      page.getLeoLogValue(
        3,
        'status',
        createStringSearchRegex(`Unexpected Action: Not in preset`),
      );

      cy.contains('VERIFIED', { timeout: 10000 }).should('be.visible');
    });
  });

  it('4.1.5 - when receiving logs of preset with multiple actions, if the order is wrong, should color the incorrect logs red, and still have verified status', () => {
    //     export const MULTIPLE_ACTIONS_PRESET_JSON_NAME = 'presets.json';
    // export const MULTIPLE_ACTIONS_PRESET_NAME = 'test2';
    // export const FIRST_PRESET_JSON_PROJECT_ID = 'action1';
    // export const SECOND_PRESET_JSON_PROJECT_ID = 'action2';
    // export const THIRD_PRESET_JSON_PROJECT_ID = 'action3';
    stationsPage.visit();
    stationsPage.createStationMock({
      name: EXAMPLE_STATION_NAME,
      stationLinks: [STATION_LINK_1],
    });
    cy.triggerProbeAllInPocketBase();

    presetsPage.visit();
    presetsPage.importPreset(
      MULTIPLE_ACTIONS_PRESET_JSON_NAME,
      MULTIPLE_ACTIONS_PRESET_NAME,
    );

    dashboardPage.visit();
    dashboardPage.changeToPreset(MULTIPLE_ACTIONS_PRESET_NAME);
    cy.triggerProbeAllInPocketBase();

    stationsPage.visit();

    stationsPage.activateStationLink(EXAMPLE_STATION_NAME, STATION_LINK_1);

    cy.triggerProbeAllInPocketBase();
    page.visit();
    page.insertLoggerValue('magic', 12345678);
    page.insertLoggerValue('delta', 10);

    // page.injectLeoRecord({
    //   projectId: SECOND_PRESET_JSON_PROJECT_ID,
    //   payload: '0x00000000000002',
    //   reserved: '0x00000000000002',
    //   decoderId: VALID_DECODER_ID,
    //   counter: 1,
    //   timeOfArrival: new Date().toISOString(),
    // });
    page.injectLeoRecords([
      {
        projectId: FIRST_PRESET_JSON_PROJECT_ID,
        payload: '0x00000000000001',
        reserved: '0x00000000000001',
        decoderId: VALID_DECODER_ID,
        counter: 2,
        timeOfArrival: new Date().toISOString(),
      },
      {
        projectId: THIRD_PRESET_JSON_PROJECT_ID,
        payload: '0x00000000000003',
        reserved: '0x00000000000003',
        decoderId: VALID_DECODER_ID,
        counter: 3,
        timeOfArrival: new Date().toISOString(),
      },
      {
        projectId: SECOND_PRESET_JSON_PROJECT_ID,
        payload: '0x00000000000002',
        reserved: '0x00000000000002',
        decoderId: VALID_DECODER_ID,
        counter: 4,
        timeOfArrival: new Date().toISOString(),
      },
    ]);

    cy.wait(1000).then(() => {
      page.getLeoLogValue(
        0,
        'status',
        createStringSearchRegex(`Preset Action #1 (Valid)`),
      );

      page.getLeoLogValue(
        1,
        'status',
        createStringSearchRegex(`Incorrect Order: Expected action #2`),
      );

      page.getLeoLogValue(
        2,
        'status',
        createStringSearchRegex(`Incorrect Order: Expected action #1`),
      );

      //     page.getLeoLogValue(
      //   3,
      //   'status',
      //   createStringSearchRegex(`Preset Action #1 (Valid)`),
      // );
      cy.contains('VERIFIED', { timeout: 10000 }).should('be.visible');
    });
  });

  it('4.1.6 -  when receiving logs of preset with multiple actions, if the order is right, should color the the logs green, and have verified status', () => {
    stationsPage.visit();
    stationsPage.createStationMock({
      name: EXAMPLE_STATION_NAME,
      stationLinks: [STATION_LINK_1],
    });
    cy.triggerProbeAllInPocketBase();

    presetsPage.visit();
    presetsPage.importPreset(
      MULTIPLE_ACTIONS_PRESET_JSON_NAME,
      MULTIPLE_ACTIONS_PRESET_NAME,
    );

    dashboardPage.visit();
    dashboardPage.changeToPreset(MULTIPLE_ACTIONS_PRESET_NAME);
    cy.triggerProbeAllInPocketBase();

    stationsPage.visit();

    stationsPage.activateStationLink(EXAMPLE_STATION_NAME, STATION_LINK_1);

    cy.triggerProbeAllInPocketBase();
    page.visit();
    page.insertLoggerValue('magic', 12345678);
    page.insertLoggerValue('delta', 10);

    page.injectLeoRecords([
      {
        projectId: FIRST_PRESET_JSON_PROJECT_ID,
        payload: '0x00000000000001',
        reserved: '0x00000000000001',
        decoderId: VALID_DECODER_ID,
        counter: 2,
        timeOfArrival: new Date().toISOString(),
      },
      {
        projectId: SECOND_PRESET_JSON_PROJECT_ID,
        payload: '0x00000000000002',
        reserved: '0x00000000000002',
        decoderId: VALID_DECODER_ID,
        counter: 4,
        timeOfArrival: new Date().toISOString(),
      },
      {
        projectId: THIRD_PRESET_JSON_PROJECT_ID,
        payload: '0x00000000000003',
        reserved: '0x00000000000003',
        decoderId: VALID_DECODER_ID,
        counter: 3,
        timeOfArrival: new Date().toISOString(),
      },
    ]);

    cy.wait(1000).then(() => {
      page.getLeoLogValue(
        0,
        'status',
        createStringSearchRegex(`Preset Action #1 (Valid)`),
      );

      page.getLeoLogValue(
        1,
        'status',
        createStringSearchRegex(`Preset Action #2 (Valid)`),
      );

      page.getLeoLogValue(
        2,
        'status',
        createStringSearchRegex(`Preset Action #3 (Valid)`),
      );

      cy.contains('VERIFIED', { timeout: 10000 }).should('be.visible');
    });
  });
});
