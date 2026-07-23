/// <reference path="../pb_data/types.d.ts" />

onRecordAfterCreateSuccess((e) => {
  const { createBackup } = require(`${__hooks}/api.utils`);
  const parameters = JSON.parse(e.record.get('parameters'));

  if ('snr' in parameters && parameters.snr < 100) {
    createBackup('low_snr');
  } else if ('pllLockState' in parameters && parameters.pllLockState === 0) {
    createBackup('lock_loss');
  } else if ('carrierPhase' in parameters && parameters.carrierPhase > 100) {
    createBackup('high_carrier_phase');
  }

  e.next();
}, 'rapha');
