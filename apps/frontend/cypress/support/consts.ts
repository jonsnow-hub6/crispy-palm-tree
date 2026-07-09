import PocketBase from 'pocketbase';
import { CreateUserArgs } from './types/pages';

const username = 'testUser';
const password = 'Password1!';
export const CREATE_USER_ARGS: CreateUserArgs = {
  username,
  password,
  permission: ['dashboard', 'stations', 'presets', 'decoder'],
};

export const POCKETBASE_URL = 'http://localhost:8090';
export const pb = new PocketBase(POCKETBASE_URL);
pb.autoCancellation(false);
