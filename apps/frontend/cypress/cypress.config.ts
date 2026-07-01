import { defineConfig } from 'cypress';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';

export default defineConfig({
  e2e: {
    baseUrl:
      process.env.CYPRESS_BASE_URL ||
      process.env.VITE_APP_URL ||
      'http://127.0.0.1:4200',
    specPattern: path.resolve(__dirname, 'e2e/**/*.cy.ts'),
    supportFile: path.resolve(__dirname, 'support/e2e.ts'),
    fixturesFolder: path.resolve(__dirname, 'fixtures'),
    setupNodeEvents(on, config) {
      config.env.POCKETBASE_USERNAME =
        process.env.POCKETBASE_USERNAME || 'e2e@example.com';
      config.env.POCKETBASE_PASSWORD =
        process.env.POCKETBASE_PASSWORD || 'Aa123456';

      let mockProcess: ChildProcess | undefined;

      on('task', {
        startMockStationServer(args) {
          const port = args?.port ?? '4000';
          const host = args?.host ?? 'localhost';

          if (mockProcess) {
            return null; // already running
          }

          const mockPath = path.resolve(
            __dirname,
            '../../../mocks/station-mock/mock.js',
          );

          mockProcess = spawn('node', [mockPath], {
            stdio: 'inherit',
            shell: true, // helps on Windows; harmless on Linux/macOS
            env: {
              ...process.env,
              HOST: host,
              PORT: port,
            },
          });
          return null;
        },

        stopMockStationServer() {
          if (mockProcess) {
            mockProcess.kill('SIGTERM');
            mockProcess = undefined;
          }

          return null;
        },
      });

      return config;
    },
  },
  viewportWidth: Number(process.env.CYPRESS_VIEWPORT_WIDTH || 1280),
  viewportHeight: Number(process.env.CYPRESS_VIEWPORT_HEIGHT || 720),
  video: process.env.CYPRESS_VIDEO === 'true',
  chromeWebSecurity: false,
  env: {
    allowCypressEnv: false,
  },
});
