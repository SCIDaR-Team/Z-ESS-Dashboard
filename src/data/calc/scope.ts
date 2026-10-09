import type { Dataset } from '../normalise';
import { getLga, getState, lgasIn, STATES } from '../reference/geography';

export interface Scope {
  stateId: string | null;
  lgaId: string | null;
  wardId?: string | null;
  settlementId?: string | null;
}

export interface Located {
  stateId: string;
  lgaId: string;
  settlementId: string;
  wardId?: string;
}

export type Level = 'lga' | 'ward' | 'settlement';

export interface BreakdownRowDef {
  key: string;
  label: string;
  stateId: string;
}

export interface Breakdown {
  level: Level;
  /** Every row the table must show, in display order — including rows with no data. */
  rows: BreakdownRowDef[];
  keyOf: (loc: Located) => string;
}

export function inScope(loc: Located, scope: Scope, wardOf?: (settlementId: string) => string | undefined): boolean {
  if (scope.stateId && loc.stateId !== scope.stateId) return false;
  if (scope.lgaId && loc.lgaId !== scope.lgaId) return false;
  if (scope.settlementId && loc.settlementId !== scope.settlementId) return false;
  if (scope.wardId) {
    const ward = loc.wardId ?? wardOf?.(loc.settlementId);
    if (ward !== scope.wardId) return false;
  }
  return true;
}

/**
 * The level one step below the narrowest filter: LGAs for a state (or all
 * states); for one LGA, `afterLga` (wards on the line list, settlements on the
 * supervisory page, which has no ward filter); settlements for a ward.
 */
export function breakdownFor(ds: Dataset, scope: Scope, afterLga: 'ward' | 'settlement'): Breakdown {
  if (scope.lgaId) {
    const stateId = getLga(scope.lgaId)!.stateId;
    if (afterLga === 'ward' && !scope.wardId && !scope.settlementId) {
      const rows = ds.wards.filter((w) => w.lgaId === scope.lgaId).map((w) => ({ key: w.id, label: w.name, stateId }));
      const wardOf = settlementWardIndex(ds);
      return { level: 'ward', rows, keyOf: (l) => l.wardId ?? wardOf(l.settlementId) ?? '' };
    }
    const rows = ds.settlements
      .filter((s) => s.lgaId === scope.lgaId)
      .filter((s) => !scope.wardId || s.wardId === scope.wardId)
      .filter((s) => !scope.settlementId || s.id === scope.settlementId)
      .map((s) => ({ key: s.id, label: s.name, stateId }));
    return { level: 'settlement', rows, keyOf: (l) => l.settlementId };
  }
  const rows = lgasIn(scope.stateId).map((l) => ({ key: l.id, label: l.name, stateId: l.stateId }));
  return { level: 'lga', rows, keyOf: (l) => l.lgaId };
}

const wardIndexCache = new WeakMap<Dataset, Map<string, string>>();

export function settlementWardIndex(ds: Dataset): (settlementId: string) => string | undefined {
  let idx = wardIndexCache.get(ds);
  if (!idx) {
    idx = new Map(ds.settlements.map((s) => [s.id, s.wardId]));
    wardIndexCache.set(ds, idx);
  }
  const m = idx;
  return (id) => m.get(id);
}

/** States shown as subtotal groups: only when the table lists LGAs across every state. */
export function subtotalStates(breakdown: Breakdown, scope: Scope): { id: string; name: string }[] {
  if (breakdown.level !== 'lga' || scope.stateId || scope.lgaId) return [];
  return STATES.map((s) => ({ id: s.id, name: getState(s.id)!.name }));
}

export const LEVEL_LABEL: Record<Level, string> = { lga: 'LGA', ward: 'Ward', settlement: 'Settlement' };
