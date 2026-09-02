// insertLeoData.js

const PocketBase = require('pocketbase/cjs');

console.log('Logger script starting...');

const PB_URL = process.env.PB_URL || 'http://127.0.0.1:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD;

const pb = new PocketBase(PB_URL);

let counter = 0;

// ----------------------------
// Optional admin login
// ----------------------------
async function loginAdmin() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.log('Skipping admin login');
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
// Send one record
// ----------------------------
async function sendRecord(record) {
  try {
    await pb.collection('leo').create(record);

    console.log(
      `Successfully inserted record with payload: ${record.payload} (projectId: ${record.projectId})`,
    );
  } catch (err) {
    console.error(`Failed to insert record with payload: ${record.payload}`);
    console.error(err);
  }
}

// ----------------------------
// Main loop
// ----------------------------
async function runForever() {
  while (true) {
    const records = [
      {
        projectId: '1234',
        counter: counter++,
        magic: Math.floor(Math.random() * 99999999),
        payload: '0x00000000000001',
        timeOfArrival: new Date().toISOString(),
        reserved: '0x00000000000001',
        messageType: Math.floor(Math.random() * 10),
        management: Math.floor(Math.random() * 10),
        threshold: Math.floor(Math.random() * 10),
        decoderId: `decoder2`,
      },
      {
        projectId: '1234',
        counter: counter++,
        magic: 12345678,
        payload: '0x00000000000002',
        timeOfArrival: new Date().toISOString(),
        reserved: '0x00000000000002',
        messageType: Math.floor(Math.random() * 10),
        management: Math.floor(Math.random() * 10),
        threshold: Math.floor(Math.random() * 10),
        decoderId: `decoder2`,
      },
      {
        projectId: '1234',
        counter: counter++,
        magic: 12345678,
        payload: '0x00000000000001',
        reserved: '0x00000000000001',
        messageType: Math.floor(Math.random() * 10),
        management: Math.floor(Math.random() * 10),
        threshold: Math.floor(Math.random() * 10),
        timeOfArrival: new Date().toISOString(),
        decoderId: `decoder2`,
      },
      {
        projectId: '1234',
        counter: counter++,
        magic: Math.floor(Math.random() * 99999999),
        payload: '0x00000000000001',
        timeOfArrival: new Date().toISOString(),
        reserved: '0x00000000000001',
        messageType: Math.floor(Math.random() * 10),
        management: Math.floor(Math.random() * 10),
        threshold: Math.floor(Math.random() * 10),
        decoderId: `decoder1`,
      },
      {
        projectId: '1234',
        counter: counter++,
        magic: 12345678,
        payload: '0x00000000000002',
        timeOfArrival: new Date().toISOString(),
        reserved: '0x00000000000002',
        messageType: Math.floor(Math.random() * 10),
        management: Math.floor(Math.random() * 10),
        threshold: Math.floor(Math.random() * 10),
        decoderId: `decoder1`,
      },
      {
        projectId: '1234',
        counter: counter++,
        magic: 12345678,
        payload: '0x00000000000001',
        reserved: '0x00000000000001',
        messageType: Math.floor(Math.random() * 10),
        management: Math.floor(Math.random() * 10),
        threshold: Math.floor(Math.random() * 10),
        timeOfArrival: new Date().toISOString(),
        decoderId: `decoder1`,
      },
      // {
      //   projectId: '1245',
      //   counter: counter++,
      //   magic: 12345678,
      //   payload: '0x2345400000',
      //   reserved: '0x23454000000',
      //   messageType: Math.floor(Math.random() * 10),
      //   management: Math.floor(Math.random() * 10),
      //   threshold: Math.floor(Math.random() * 10),
      //   timeOfArrival: new Date().toISOString(),
      //   decoderId: `decoder${Math.floor(Math.random() * 2) + 1}`,
      // },
    ];

    for (const record of records) {
      await sendRecord(record);

      // wait 1 second before sending next record
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

// ----------------------------
// Run
// ----------------------------
async function main() {
  // await loginAdmin();

  await runForever();
}

main().catch(console.error);