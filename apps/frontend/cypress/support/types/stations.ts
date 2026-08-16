export interface StationValues {
  host: string;
  port: number;
  counter?: number;
  status?: string;
}

export interface Station {
  name: string;
  stationLinks: StationLink[];
}

export interface StationLink {
  id: string;
  port: number;
  host: string;
}

export type PresetCommand = {
  id: string;
  payload: string;
};

interface StationLinkSetActiveRequest {
  path: '/api/setActive';
  method: 'POST';
  parameters: {
    active: boolean;
  };
}

interface StationLinkSetPresetRequest {
  path: '/api/setPreset';
  method: 'POST';
  parameters: {
    presetName: string;
    commands: PresetCommand[];
  };
}

interface StationLinkSetCounterRequest {
  path: '/api/setCounter';
  method: 'POST';
  parameters: {
    setCounter: number;
  };
}

export type StationLinkRequest =
  | StationLinkSetActiveRequest
  | StationLinkSetPresetRequest
  | StationLinkSetCounterRequest;
