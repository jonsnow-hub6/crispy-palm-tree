export type RaphaBase = {
  id: string;
  created: string; // ISO timestamp
  name: string;
  parameters: Record<string, unknown>;
};

export type RaphaDllM2 = {
  id: string;
  created: string;
  name: 'dllM2';
  parameters: { dllM2: number };
};

export type RaphaDllM4 = {
  id: string;
  created: string;
  name: 'dllM4';
  parameters: { dllM4: number };
};

export type RaphaPllLockState = {
  id: string;
  created: string;
  name: 'pllLockState';
  parameters: { pllLockState: 0 | 1 };
};

export type RaphaKnown = RaphaDllM2 | RaphaDllM4 | RaphaPllLockState;

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
