import { GetLeoLogParams } from '../../support/pages/DecoderPage';
import { createStringSearchRegex } from '../../support/utils/utils';
import {
  FIRST_PRESET_JSON_PROJECT_ID,
  PRESET_JSON_PROJECT_ID,
  SECOND_PRESET_JSON_PROJECT_ID,
  THIRD_PRESET_JSON_PROJECT_ID,
} from '../presets/consts';
import { createLeoLog } from './utils';

export const VALID_DECODER_ID = 'decoder2';
export const PLL_GRAPH_NAME = 'pllLockState';

export const VALID_ACTION_PAYLOAD = '0x00000000000001';
export const INVALID_ACTION_PAYLOAD = '0x00000000000009';

export const VALID_FIRST_ACTION_PAYLOAD = '0x00000000000001';
export const VALID_SECOND_ACTION_PAYLOAD = '0x00000000000002';
export const VALID_THIRD_ACTION_PAYLOAD = '0x00000000000003';

export const VALID_MAGIC = 1234;
export const INVALID_MAGIC = 12345678;
export const VALID_COUNTER = 1;

export const VALID_PACKETS_WITH_SOME_INVALID = [
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
];

export const VALID_PACKETS_WITH_INCORRECT_ORDER = [
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
];

export const VALID_PACKETS_WITH_CORRECT_ORDER = [
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
];

export const VALID_PACKETS_WITH_SOME_INVALID_EXPECTED_LOGS: GetLeoLogParams[] =
  [
    {
      index: 0,
      field: 'status',
      regex: createStringSearchRegex(`Unexpected Action: Not in preset`),
    },

    {
      index: 1,
      field: 'status',
      regex: createStringSearchRegex(`Preset Action #1 (Valid)`),
    },

    {
      index: 2,
      field: 'status',
      regex: createStringSearchRegex(`Preset Action #1 (Valid)`),
    },

    {
      index: 3,
      field: 'status',
      regex: createStringSearchRegex(`Unexpected Action: Not in preset`),
    },
  ];

export const VALID_PACKETS_WITH_INCORRECT_ORDER_EXPECTED_LOGS: GetLeoLogParams[] =
  [
    {
      index: 0,
      field: 'status',
      regex: createStringSearchRegex(`Preset Action #1 (Valid)`),
    },

    {
      index: 1,
      field: 'status',
      regex: createStringSearchRegex(`Incorrect Order: Expected action #2`),
    },

    {
      index: 2,
      field: 'status',
      regex: createStringSearchRegex(`Incorrect Order: Expected action #1`),
    },
  ];

export const VALID_PACKETS_WITH_CORRECT_ORDER_EXPECTED_LOGS: GetLeoLogParams[] =
  [
    {
      index: 0,
      field: 'status',
      regex: createStringSearchRegex(`Preset Action #1 (Valid)`),
    },
    {
      index: 1,
      field: 'status',
      regex: createStringSearchRegex(`Preset Action #2 (Valid)`),
    },
    {
      index: 2,
      field: 'status',
      regex: createStringSearchRegex(`Preset Action #3 (Valid)`),
    },
  ];

export const PLL_LOCK_STATE_0_PACKET = {
  name: 'pllLockState',
  parameters: {
    pllLockState: 0,
  },
  decoderId: VALID_DECODER_ID,
} as const;

export const PLL_LOCK_STATE_1_PACKET = {
  name: 'pllLockState',
  parameters: {
    pllLockState: 1,
  },
  decoderId: VALID_DECODER_ID,
} as const;
