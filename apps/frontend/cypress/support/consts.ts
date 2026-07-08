import PocketBase from 'pocketbase';

export const POCKETBASE_URL = 'http://localhost:8090';
export const pb = new PocketBase(POCKETBASE_URL);
pb.autoCancellation(false);
