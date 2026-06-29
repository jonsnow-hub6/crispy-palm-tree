export interface AuthRecord {
  id: string;
  username: string;
  avatar: string;
  permission: Array<string>;
  collectionId: string;
  collectionName: string;
}

export interface AuthParameters {
  token: string;
  record: AuthRecord;
}
