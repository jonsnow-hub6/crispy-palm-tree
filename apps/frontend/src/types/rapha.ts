export type RaphaBase = {
  id: string;
  created: string; // ISO timestamp
  name: string;
  parameters: Record<string, unknown>;
};

export type RaphaSnr = {
  id: string;
  created: string;
  name: 'snr';
  parameters: { snr: number };
};

export type RaphaPllLockState = {
  id: string;
  created: string;
  name: 'pllLockState';
  parameters: { pllLockState: 0 | 1 };
};

export type RaphaKnown = RaphaSnr | RaphaPllLockState;

export type RaphaRecord = RaphaKnown | RaphaBase;

// Type guards
export function isRaphaBase(x: unknown): x is RaphaBase {
  return (
    typeof x === 'object' &&
    x !== null &&
    'id' in x &&
    'created' in x &&
    'name' in x &&
    'parameters' in x
  );
}
