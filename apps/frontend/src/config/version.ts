import packageJson from '../../../../package.json';

export const APP_VERSION: string =
  (typeof import.meta !== 'undefined' && import.meta.env?.PACKAGE_VERSION) ||
  packageJson.version ||
  '0.0.0';
