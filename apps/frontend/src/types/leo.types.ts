export interface LeoRecord {
  id: string;
  projectId: string;
  counter: number;
  magic: number;
  payload: string;
  timeOfArrival: string;
  decoderId: string;
  created?: string;
}

export type LeoEventRaw = Partial<LeoRecord> & { id?: string };
