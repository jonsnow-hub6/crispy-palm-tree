import { Station, StationLink } from '../../support/types';

export const EXAMPLE_STATION_NAME = 'mocked-station';

export const SECOND_EXAMPLE_STATION_NAME = 'mocked-station-2';

export const STATION_LINK_1: StationLink = {
  host: 'localhost',
  port: 4010,
  id: 'localhost-4010',
};

export const STATION_LINK_2: StationLink = {
  host: 'localhost',
  port: 4011,
  id: 'localhost-4011',
};

export const STATION_LINK_3: StationLink = {
  host: 'localhost',
  port: 4012,
  id: 'localhost-4012',
};

const createStationName = 'testStation';

export const CREATE_STATION_TEST_FIELDS = {
  name: createStationName,
  host: 'localhost',
  port: '9090',
};

export const CREATE_STATION_REQUEST_PAYLOAD = {
  name: createStationName,
  stationLinks: [{ host: 'localhost', port: 9090 }],
};

export const MOCK_MULTIPLE_SEEDED_STATIONS: Station[] = [
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
