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
// Insert one rapha cycle
// ----------------------------
async function insertRaphaData() {
  try {
    // pllLockState (0 or 1)
    await pb.collection('rapha').create({
      name: 'pllLockState',
      parameters: {
        pllLockState: Math.random() > 0.5 ? 1 : 0,
      },
      decoderId: 'decoder2',
    });

    await pb.collection('rapha').create({
      name: 'carrierPhase',
      parameters: {
        carrierPhase: Math.floor(Math.random() * 100),
      },
      decoderId: 'decoder2',
    });

    console.log('Inserted pllLockState');

    await pb.collection('rapha').create({
      name: 'snr',
      parameters: {
        snr: Math.floor(Math.random() * 1000),
      },
      decoderId: 'decoder2',
    });


    await pb.collection('rapha').create({
      name: 'pllLockState',
      parameters: {
        pllLockState: Math.random() > 0.5 ? 1 : 0,
      },
      decoderId: 'decoder1',
    });

    await pb.collection('rapha').create({
      name: 'carrierPhase',
      parameters: {
        carrierPhase: Math.floor(Math.random() * 100),
      },
      decoderId: 'decoder1',
    });

    console.log('Inserted pllLockState');

    await pb.collection('rapha').create({
      name: 'snr',
      parameters: {
        snr: Math.floor(Math.random() * 1000),
      },
      decoderId: 'decoder1',
    });

    console.log('Inserted snr');

  } catch (err) {
    console.error('Insert failed:', err.response || err.message);
  }
}

// ----------------------------
// Run once
// ----------------------------
async function main() {
  await loginAdmin();
  await insertRaphaData();

  // 🔥 Uncomment to simulate realtime stream
  setInterval(insertRaphaData, 1000);
}

main();
