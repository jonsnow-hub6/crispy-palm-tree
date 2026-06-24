export interface LeoRecord {
  id: string;
  projectId: string;
  counter: number;
  magic: number;
  payload: string;
  reserved: string;
  messageType: number;
  management: number;
  threshold: number;
  timeOfArrival: string;
  decoderId: string;
  created?: string;
  isCounterCorrect?: boolean | null;
  presetId?: string | null;
  presetIndex?: number | null;
  presetStatus?: 'valid' | 'unexpected_action' | 'incorrect_order' | 'missing_action' | 'incomplete_old_preset' | null;
}

export type LeoEventRaw = Partial<LeoRecord> & { id?: string };
