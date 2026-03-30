export type RaphaPoint = { ts: number; value: number; decoderId?: string };

class RaphaRealtimeStore {
  pllPoints: RaphaPoint[] = [];
  dllResults: RaphaPoint[] = [];
  maxPoints = 1200;
  listeners: Set<() => void> = new Set();
  
  addPoints(type: 'pll' | 'dll', newPoints: RaphaPoint[]) {
    const list = type === 'pll' ? this.pllPoints : this.dllResults;
    for (const p of newPoints) {
      list.push(p);
    }
    
    // Sort array just in case out of order
    list.sort((a, b) => a.ts - b.ts);
    
    const cutoff = Date.now() - 60_000;
    
    // Prune old points
    let keepIdx = 0;
    while(keepIdx < list.length && list[keepIdx].ts < cutoff) {
      keepIdx++;
    }
    if (keepIdx > 0) list.splice(0, keepIdx);
    
    // Max length prune
    if (list.length > this.maxPoints) {
      list.splice(0, list.length - this.maxPoints);
    }
    
    this.notify();
  }
  
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  
  notify() {
    for (const l of this.listeners) l();
  }
}

export const raphaStore = new RaphaRealtimeStore();
