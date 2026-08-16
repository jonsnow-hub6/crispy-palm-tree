import { CreateStationArgs, MockStationManager } from './mock-stations-manager';

const manager = new MockStationManager();

export function registerMockTasks(on: Cypress.PluginEvents) {
  on('task', {
    startMockStationServer(args: CreateStationArgs) {
      manager.start(args);
      return null;
    },

    stopMockStationServer({ id }) {
      manager.stop(id);
      return null;
    },

    stopAllMockStationServers() {
      manager.stopAll();
      return null;
    },
  });
}
