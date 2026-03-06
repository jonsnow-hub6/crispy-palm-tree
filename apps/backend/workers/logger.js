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
      projectId: `project-${Math.floor(Math.random() * 10)}`,
      counter: Math.floor(Math.random() * 1000),
      magic: Math.floor(Math.random() * 9999),
      payload: `${Math.random().toString(36).substring(2, 10)}`,
      timeOfArrival: new Date().toISOString(),
      decoderId: `decoder${Math.floor(Math.random() * 2) + 1}`, // decoder1..decoder5
    };

    const created = await pb.collection('leo').create(record);
    console.log('Inserted leo record:', created);
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
  setInterval(insertLeoData, 500);
}

main();