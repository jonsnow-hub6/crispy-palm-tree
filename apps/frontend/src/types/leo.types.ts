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
}

export type LeoEventRaw = Partial<LeoRecord> & { id?: string };
