// insertLeoData.js
const PocketBase = require('pocketbase/cjs');

const PB_URL = process.env.PB_URL || 'http://127.0.0.1:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD;

const pb = new PocketBase(PB_URL);

// ----------------------------
// Optional admin login
// ----------------------------
async function loginAdmin() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.log('No admin credentials provided, skipping login...');
    return;
  }

  try {
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('Admin authenticated');
  } catch (err) {
    console.error('Admin auth failed:', err.message);
  }
}

// ----------------------------
// Insert one leo record
// ----------------------------
async function insertLeoData() {
  try {
    const record = {
      projectId: `1234`,
      counter: Math.floor(Math.random() * 10000000),
      magic: Math.floor(Math.random() * 99999999),
      payload: `0x23454`,
      timeOfArrival: new Date().toISOString(),
      reserved: `0x23454000000`,
      messageType: Math.floor(Math.random() * 10),
      management: Math.floor(Math.random() * 10),
      threshold: Math.floor(Math.random() * 10),
      decoderId: `decoder${Math.floor(Math.random() * 2) + 1}`, // decoder1..decoder5
    };

    const created = await pb.collection('leo').create(record);
    console.log('Inserted leo record:', created);

    const record1 = {
      projectId: `1234`,
      counter: Math.floor(Math.random() * 10000000),
      magic: 12345678,
      payload: `0xefa400000`,
      timeOfArrival: new Date().toISOString(),
      reserved: `0xefa4000000`,
      messageType: Math.floor(Math.random() * 10),
      management: Math.floor(Math.random() * 10),
      threshold: Math.floor(Math.random() * 10),
      decoderId: `decoder${Math.floor(Math.random() * 2) + 1}`, // decoder1..decoder5
    };

    const created1 = await pb.collection('leo').create(record1);
    console.log('Inserted leo record:', created1);

    const record2 = {
      projectId: `1234`,
      counter: Math.floor(Math.random() * 10000000),
      magic: 12345678,
      payload: `0x2345400000`,
      reserved: `0x23454000000`,
      messageType: Math.floor(Math.random() * 10),
      management: Math.floor(Math.random() * 10),
      threshold: Math.floor(Math.random() * 10),
      timeOfArrival: new Date().toISOString(),
      decoderId: `decoder${Math.floor(Math.random() * 2) + 1}`, // decoder1..decoder5
    };

    const created2 = await pb.collection('leo').create(record2);
    console.log('Inserted leo record:', created1);

    const record3 = {
      projectId: `1245`,
      counter: Math.floor(Math.random() * 10000000),
      magic: 12345678,
      payload: `0x2345400000`,
      reserved: `0x23454000000`,
      messageType: Math.floor(Math.random() * 10),
      management: Math.floor(Math.random() * 10),
      threshold: Math.floor(Math.random() * 10),
      timeOfArrival: new Date().toISOString(),
      decoderId: `decoder${Math.floor(Math.random() * 2) + 1}`, // decoder1..decoder5
    };

    const created3 = await pb.collection('leo').create(record3);
  } catch (err) {
    console.error('Insert failed:', err.response || err.message);
  }
}

// ----------------------------
// Run once or simulate stream
// ----------------------------
async function main() {
  //   await loginAdmin();

  // Insert once
  await insertLeoData();

  // 🔥 Uncomment to simulate realtime stream every 500ms
  setInterval(insertLeoData, 1000);
}

main();
