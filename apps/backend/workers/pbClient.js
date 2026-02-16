const PocketBase = require('pocketbase/cjs');

const PB_URL = process.env.PB_URL || 'http://127.0.0.1:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD;

const pb = new PocketBase(PB_URL);

async function ensureAdmin() {
  if (ADMIN_EMAIL && ADMIN_PASSWORD) {
    try {
      await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
      console.log('PocketBase admin authenticated');
    } catch (err) {
      console.warn('Failed admin auth:', err && err.message ? err.message : err);
    }
  }
}

async function getAllStations() {
  // fetch all station records
  return pb.collection('stations').getFullList({ sort: '-created' });
}

async function getStation(id) {
  return pb.collection('stations').getOne(id);
}

async function updateStation(id, data) {
  return pb.collection('stations').update(id, data);
}

async function createNotification(data) {
  return pb.collection('notifications').create(data);
}

module.exports = { pb, ensureAdmin, getAllStations, getStation, updateStation, createNotification };
