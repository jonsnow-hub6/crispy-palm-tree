export interface Station {
  name: string;
  stationLinks: StationLink[];
}

export interface StationLink {
  id: string;
  port: number;
  host: string;
}

export interface LeoRecord {
  id?: string;
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
}
