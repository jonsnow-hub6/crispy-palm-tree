import DashboardPage from '../../support/pages/DashboardPage';
import PresetsPage from '../../support/pages/PresetsPage';
import StationsPage from '../../support/pages/StationsPage';
import { LeoRecord } from '../../support/types';
import {
  MULTIPLE_ACTIONS_PRESET_JSON_NAME,
  MULTIPLE_ACTIONS_PRESET_NAME,
  PRESETS_JSON_NAME,
  PRESETS_JSON_PRESET_NAME,
} from '../presets/consts';
import { EXAMPLE_STATION_NAME, STATION_LINK_1 } from '../stations/consts';
import { VALID_DECODER_ID } from './consts';

const stationsPage = new StationsPage();
const presetsPage = new PresetsPage();
const dashboardPage = new DashboardPage();

export function createStationWithSingleActionPresetSetup() {
  stationsPage.visit();
  stationsPage.createStationMock({
    name: EXAMPLE_STATION_NAME,
    stationLinks: [STATION_LINK_1],
  });
  cy.triggerProbeAllInPocketBase();

  presetsPage.visit();
  presetsPage.importPreset(PRESETS_JSON_NAME, PRESETS_JSON_PRESET_NAME);

  dashboardPage.visit();
  dashboardPage.changeActivePreset(PRESETS_JSON_PRESET_NAME);
  cy.triggerProbeAllInPocketBase();

  stationsPage.visit();

  stationsPage.activateStationLink(EXAMPLE_STATION_NAME, STATION_LINK_1);

  cy.triggerProbeAllInPocketBase();
}

export function createStationWithMultipleActionPresetSetup() {
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
  dashboardPage.changeActivePreset(MULTIPLE_ACTIONS_PRESET_NAME);
  cy.triggerProbeAllInPocketBase();

  stationsPage.visit();

  stationsPage.activateStationLink(EXAMPLE_STATION_NAME, STATION_LINK_1);

  cy.triggerProbeAllInPocketBase();
}

export function createLeoLog(
  projectId: string,
  payload: string,
  reserved: string,
  magic?: number,
  counter?: number,
  decoderId?: string,
  timeOfArrival?: string,
): Partial<LeoRecord> {
  console.dir({
    projectId: projectId,
    magic: magic ?? 1234,
    payload: payload,
    reserved: reserved,
    decoderId: decoderId ?? VALID_DECODER_ID,
    counter: counter ?? 0,
    timeOfArrival: timeOfArrival ?? new Date().toISOString(),
  });
  return {
    projectId: projectId,
    magic: magic ?? 1234,
    payload: payload,
    reserved: reserved,
    decoderId: decoderId ?? VALID_DECODER_ID,
    counter: counter ?? 0,
    timeOfArrival: timeOfArrival ?? new Date().toISOString(),
  };
}
