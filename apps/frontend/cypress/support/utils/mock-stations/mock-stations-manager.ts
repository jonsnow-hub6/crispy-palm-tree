import { ChildProcess, spawn } from 'child_process';
import path from 'path';

export interface CreateStationArgs {
  id: string;
  port: number;
  host?: string;
  config?: object;
}

export class MockStationManager {
  private processes = new Map<string, ChildProcess>();

  start(args: CreateStationArgs) {
    if (this.processes.has(args.id)) {
      return;
    }
    const mockPath = path.join(
      process.cwd(),
      'mocks',
      'station-mock',
      'mock.js',
    );

    const proc = spawn('node', [mockPath], {
      stdio: 'inherit',
      env: {
        ...process.env,
        HOST: args.host ?? 'localhost',
        PORT: String(args.port ?? 4000),
        MOCK_CONFIG: JSON.stringify(args.config ?? {}),
      },
    });

    this.processes.set(args.id, proc);

    proc.on('exit', () => {
      this.processes.delete(args.id);
    });
  }

  stop(id: string) {
    const proc = this.processes.get(id);

    if (proc) {
      proc.kill('SIGTERM');
      this.processes.delete(id);
    }
  }

  stopAll() {
    for (const proc of this.processes.values()) {
      proc.kill('SIGTERM');
    }

    this.processes.clear();
  }
}
