export interface Station {
  name: string;
  stationLinks: StationLink[];
}

export interface StationLink {
  id: string;
  port: number;
  host: string;
}
