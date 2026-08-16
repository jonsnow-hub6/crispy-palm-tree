import { LeoRecord } from '../types';

export const DEFAULT_LEO_RECORD_VALUES: Partial<LeoRecord> = {
  projectId: '1234',
  payload: '0x00000000000001',
  timeOfArrival: new Date().toISOString(),
  reserved: '0x00000000000001',
  decoderId: 'decoder2',
};
