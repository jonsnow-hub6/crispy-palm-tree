import { LeoRecord, RaphaRecord } from '../types';

export interface GetLeoLogParams {
  index: number;
  field: 'status' | 'magic-mismatch';
  regex?: RegExp;
}

export const DecoderRecordOptions = ['leo', 'rapha'] as const;

export type DecoderRecordName = (typeof DecoderRecordOptions)[number];

export type DecoderRecordTypes = {
  leo: LeoRecord;
  rapha: RaphaRecord;
};
