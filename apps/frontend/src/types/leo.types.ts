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
}

export type LeoEventRaw = Partial<LeoRecord> & { id?: string };
