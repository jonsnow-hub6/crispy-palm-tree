import { DecoderPage } from '../../support/pages/DecoderPage';
import StationsPage from '../../support/pages/StationsPage';
import { STATION_LINK_1 } from '../stations/consts';
import { createStringSearchRegex } from '../../support/utils/utils';
import {
  INVALID_ACTION_PAYLOAD,
  INVALID_MAGIC,
  VALID_ACTION_PAYLOAD,
  VALID_COUNTER,
  VALID_DECODER_ID,
  VALID_FIRST_ACTION_PAYLOAD,
  VALID_MAGIC,
  VALID_SECOND_ACTION_PAYLOAD,
  VALID_THIRD_ACTION_PAYLOAD,
} from './consts';
import {
  FIRST_PRESET_JSON_PROJECT_ID,
  PRESET_JSON_PROJECT_ID,
  SECOND_PRESET_JSON_PROJECT_ID,
  THIRD_PRESET_JSON_PROJECT_ID,
} from '../presets/consts';
import {
  createLeoLog,
  createStationWithMultipleActionPresetSetup,
  createStationWithSingleActionPresetSetup,
} from './utils';

describe('Decoder - Leo', () => {
  const decoderPage = new DecoderPage();
  const stationsPage = new StationsPage();

  beforeEach(() => {
    cy.resetDB();
    cy.deleteDecoderId(VALID_DECODER_ID);
    cy.createDecoderId(VALID_DECODER_ID);
    cy.killAllMockStationsLinkTcpServers();
    cy.login();
    decoderPage.visit();
  });

  it('4.1.1 - when creating a station, add a preset, sync the preset to the station, activate station, inject packets to the logger so they will match the transmitted preset. then the preset in the navbar should be valid and so does the logs', () => {
    createStationWithSingleActionPresetSetup();

    stationsPage.sendSetCounterRequestToStationLink(
      STATION_LINK_1,
      VALID_COUNTER,
    );

    cy.triggerProbeAllInPocketBase();
    decoderPage.visit();
    decoderPage.changeLeoLoggerSettings('delta', 10);
    decoderPage.changeLeoLoggerSettings('magic', VALID_MAGIC);

    decoderPage.injectLeoRecords([
      createLeoLog(
        PRESET_JSON_PROJECT_ID,
        VALID_ACTION_PAYLOAD,
        VALID_ACTION_PAYLOAD,
        VALID_MAGIC,
        VALID_COUNTER,
      ),
    ]);

    cy.contains('VERIFIED', { timeout: 10000 }).should('be.visible');

    decoderPage.getLeoLogFieldValue({
      index: 0,
      field: 'status',
      regex: createStringSearchRegex(`Preset Action #1 (Valid)`),
    });
  });

  it('4.1.2 - when creating a station, add a preset, sync the preset to the station, activate station, inject packets to the logger so they wont match the transmitted preset. then the preset in the navbar should be red and so does the logs', () => {
    createStationWithSingleActionPresetSetup();

    decoderPage.visit();
    decoderPage.changeLeoLoggerSettings('delta', 10);
    decoderPage.changeLeoLoggerSettings('magic', VALID_MAGIC);

    decoderPage.injectLeoRecords([
      createLeoLog(
        PRESET_JSON_PROJECT_ID,
        INVALID_ACTION_PAYLOAD,
        INVALID_ACTION_PAYLOAD,
        VALID_MAGIC,
        0,
      ),
    ]);
    cy.wait(1000);

    cy.contains('WAITING', { timeout: 10000 }).should('be.visible');

    decoderPage.getLeoLogFieldValue({
      index: 0,
      field: 'status',
      regex: createStringSearchRegex(`Unexpected Action: Not in preset`),
    });
  });

  it('4.1.3 - when creating a station, add a preset, sync the preset to the station, activate station, set an magic number, inject packets to the logger with not matching magic ', () => {
    createStationWithSingleActionPresetSetup();

    decoderPage.visit();
    decoderPage.changeLeoLoggerSettings('magic', VALID_MAGIC);

    decoderPage.injectLeoRecords([
      createLeoLog(
        PRESET_JSON_PROJECT_ID,
        VALID_ACTION_PAYLOAD,
        VALID_ACTION_PAYLOAD,
        INVALID_MAGIC,
        1,
      ),
    ]);

    cy.contains('WAITING', { timeout: 10000 }).should('be.visible');

    decoderPage.getLeoLogFieldValue({
      index: 0,
      field: 'magic-mismatch',
      regex: createStringSearchRegex(`true`),
    });
  });

  it('4.1.4 - when creating a station, add a preset, sync the preset to the station, activate station, inject packets to the logger so some match and some wont match the transmitted preset. then the preset in the navbar should be red and so does the logs', () => {
    createStationWithSingleActionPresetSetup();

    decoderPage.visit();
    decoderPage.changeLeoLoggerSettings('magic', VALID_MAGIC);
    decoderPage.changeLeoLoggerSettings('delta', 10);

    decoderPage.injectLeoRecords([
      createLeoLog(
        PRESET_JSON_PROJECT_ID,
        INVALID_ACTION_PAYLOAD,
        INVALID_ACTION_PAYLOAD,
        VALID_MAGIC,
        1,
      ),
      createLeoLog(
        PRESET_JSON_PROJECT_ID,
        VALID_ACTION_PAYLOAD,
        VALID_ACTION_PAYLOAD,
        VALID_MAGIC,
        2,
      ),
      createLeoLog(
        PRESET_JSON_PROJECT_ID,
        VALID_ACTION_PAYLOAD,
        VALID_ACTION_PAYLOAD,
        VALID_MAGIC,
        3,
      ),
      createLeoLog(
        PRESET_JSON_PROJECT_ID,
        INVALID_ACTION_PAYLOAD,
        INVALID_ACTION_PAYLOAD,
        VALID_MAGIC,
        4,
      ),
    ]);

    cy.wait(1000).then(() => {
      decoderPage.getLeoLogFieldValue({
        index: 0,
        field: 'status',
        regex: createStringSearchRegex(`Unexpected Action: Not in preset`),
      });

      decoderPage.getLeoLogFieldValue({
        index: 1,
        field: 'status',
        regex: createStringSearchRegex(`Preset Action #1 (Valid)`),
      });

      decoderPage.getLeoLogFieldValue({
        index: 2,
        field: 'status',
        regex: createStringSearchRegex(`Preset Action #1 (Valid)`),
      });

      decoderPage.getLeoLogFieldValue({
        index: 3,
        field: 'status',
        regex: createStringSearchRegex(`Unexpected Action: Not in preset`),
      });

      cy.contains('VERIFIED', { timeout: 10000 }).should('be.visible');
    });
  });

  it('4.1.5 - when receiving logs of preset with multiple actions, if the order is wrong, should color the incorrect logs red, and still have verified status', () => {
    const validMagic = 1234;
    createStationWithMultipleActionPresetSetup();

    decoderPage.visit();
    decoderPage.changeLeoLoggerSettings('magic', validMagic);
    decoderPage.changeLeoLoggerSettings('delta', 10);

    decoderPage.injectLeoRecords([
      createLeoLog(
        FIRST_PRESET_JSON_PROJECT_ID,
        VALID_FIRST_ACTION_PAYLOAD,
        VALID_FIRST_ACTION_PAYLOAD,
        VALID_MAGIC,
      ),
      createLeoLog(
        THIRD_PRESET_JSON_PROJECT_ID,
        VALID_THIRD_ACTION_PAYLOAD,
        VALID_THIRD_ACTION_PAYLOAD,
        VALID_MAGIC,
      ),
      createLeoLog(
        SECOND_PRESET_JSON_PROJECT_ID,
        VALID_SECOND_ACTION_PAYLOAD,
        VALID_SECOND_ACTION_PAYLOAD,
        VALID_MAGIC,
      ),
    ]);

    cy.wait(1000).then(() => {
      decoderPage.getLeoLogFieldValue({
        index: 0,
        field: 'status',
        regex: createStringSearchRegex(`Preset Action #1 (Valid)`),
      });

      decoderPage.getLeoLogFieldValue({
        index: 1,
        field: 'status',
        regex: createStringSearchRegex(`Incorrect Order: Expected action #2`),
      });

      decoderPage.getLeoLogFieldValue({
        index: 2,
        field: 'status',
        regex: createStringSearchRegex(`Incorrect Order: Expected action #1`),
      });
      cy.contains('VERIFIED', { timeout: 10000 }).should('be.visible');
    });
  });

  it('4.1.6 -  when receiving logs of preset with multiple actions, if the order is right, should color the the logs valid, and have verified status', () => {
    createStationWithMultipleActionPresetSetup();
    decoderPage.visit();
    decoderPage.changeLeoLoggerSettings('magic', VALID_MAGIC);
    decoderPage.changeLeoLoggerSettings('delta', 10);

    decoderPage.injectLeoRecords([
      createLeoLog(
        FIRST_PRESET_JSON_PROJECT_ID,
        VALID_FIRST_ACTION_PAYLOAD,
        VALID_FIRST_ACTION_PAYLOAD,
        VALID_MAGIC,
        2,
      ),
      createLeoLog(
        SECOND_PRESET_JSON_PROJECT_ID,
        VALID_SECOND_ACTION_PAYLOAD,
        VALID_SECOND_ACTION_PAYLOAD,
        VALID_MAGIC,
        3,
      ),
      createLeoLog(
        THIRD_PRESET_JSON_PROJECT_ID,
        VALID_THIRD_ACTION_PAYLOAD,
        VALID_THIRD_ACTION_PAYLOAD,
        VALID_MAGIC,
        4,
      ),
    ]);

    cy.wait(1000).then(() => {
      decoderPage.getLeoLogFieldValue({
        index: 0,
        field: 'status',
        regex: createStringSearchRegex(`Preset Action #1 (Valid)`),
      });

      decoderPage.getLeoLogFieldValue({
        index: 1,
        field: 'status',
        regex: createStringSearchRegex(`Preset Action #2 (Valid)`),
      });

      decoderPage.getLeoLogFieldValue({
        index: 2,
        field: 'status',
        regex: createStringSearchRegex(`Preset Action #3 (Valid)`),
      });

      cy.contains('VERIFIED', { timeout: 10000 }).should('be.visible');
    });
  });
});
