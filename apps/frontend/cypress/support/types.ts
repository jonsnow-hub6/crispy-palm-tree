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

interface PllLockState {
  name: 'pllLockState';
  parameters: {
    /**
     0 - 1
     */
    pllLockState: number;
  };
  decoderId: string;
}

interface CarrierPhase {
  name: 'carrierPhase';
  parameters: {
    /**
     0 - 100
     */
    carrierPhase: number;
  };
  decoderId: string;
}

interface Snr {
  name: 'snr';
  parameters: {
    /**
     0 - 1000
     */
    snr: number;
  };
  decoderId: string;
}

export type RaphaRecord = PllLockState | CarrierPhase | Snr;
