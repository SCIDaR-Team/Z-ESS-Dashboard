import { create } from 'zustand';
import type { PeriodKey } from '@/data/period';

/**
 * Each page keeps its own filters (the brief gives them different filter sets).
 * A null period means "the page default", resolved once the data's cut-off is known.
 */
export interface LineListFilters {
  stateId: string | null;
  lgaId: string | null;
  wardId: string | null;
  settlementId: string | null;
  period: PeriodKey | null;
}

export interface SupervisoryFilters {
  stateId: string | null;
  lgaId: string | null;
  period: PeriodKey | null;
}

interface FilterState {
  lineList: LineListFilters;
  supervisory: SupervisoryFilters;
  setLineList: (patch: Partial<LineListFilters>) => void;
  setSupervisory: (patch: Partial<SupervisoryFilters>) => void;
}

/**
 * Changing a level clears every level below it, unless the same patch sets
 * that lower level too (a drill-down from "All states" straight to an LGA).
 */
function cascade<T extends { stateId: string | null; lgaId: string | null; wardId?: string | null; settlementId?: string | null }>(
  cur: T,
  patch: Partial<T>
): T {
  const next = { ...cur, ...patch };
  const changed = (k: keyof T) => k in patch && patch[k] !== cur[k];
  const clear = (k: keyof T) => {
    if (k in next && !(k in patch)) (next[k] as unknown) = null;
  };
  if (changed('stateId')) (['lgaId', 'wardId', 'settlementId'] as (keyof T)[]).forEach(clear);
  else if (changed('lgaId')) (['wardId', 'settlementId'] as (keyof T)[]).forEach(clear);
  else if (changed('wardId')) clear('settlementId');
  return next;
}

export const useFilterStore = create<FilterState>()((set) => ({
  lineList: { stateId: null, lgaId: null, wardId: null, settlementId: null, period: null },
  supervisory: { stateId: null, lgaId: null, period: null },
  setLineList: (patch) => set((s) => ({ lineList: cascade(s.lineList, patch) })),
  setSupervisory: (patch) => set((s) => ({ supervisory: cascade(s.supervisory, patch) })),
}));
