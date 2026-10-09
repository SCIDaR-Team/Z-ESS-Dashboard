import { useMemo } from 'react';
import type { Dataset } from '@/data/normalise';
import { currentMonth, monthLabel, monthsBetween, previousPeriod, resolvePeriod, type PeriodKey } from '@/data/period';
import { summariseLineList, pathwayRates, type LineListRow } from '@/data/calc/lineList';
import type { Scope } from '@/data/calc/scope';
import { summariseSupervisory } from '@/data/calc/supervisory';
import { summariseTargets } from '@/data/calc/targets';
import { LEVEL_LABEL, type Level } from '@/data/calc/scope';
import { getLga, getState } from '@/data/reference/geography';
import { useFilterStore, type LineListFilters, type SupervisoryFilters } from '@/store/filterStore';

/** Filter state, calculations and drill-down helpers shared by both dashboard pages. */

export function useLineList(ds: Dataset) {
  const f = useFilterStore((s) => s.lineList);
  const set = useFilterStore((s) => s.setLineList);
  const periodKey: PeriodKey = f.period ?? 'to-date';
  const period = useMemo(() => resolvePeriod(periodKey, ds.meta), [periodKey, ds.meta]);
  const s = useMemo(
    () => summariseLineList(ds, { stateId: f.stateId, lgaId: f.lgaId, wardId: f.wardId, settlementId: f.settlementId }, period),
    [ds, f.stateId, f.lgaId, f.wardId, f.settlementId, period]
  );
  const scope: Scope = useMemo(
    () => ({ stateId: f.stateId, lgaId: f.lgaId, wardId: f.wardId, settlementId: f.settlementId }),
    [f.stateId, f.lgaId, f.wardId, f.settlementId]
  );
  const prevPeriod = useMemo(() => previousPeriod(period, ds.meta), [period, ds.meta]);
  const prev = useMemo(() => (prevPeriod ? summariseLineList(ds, scope, prevPeriod).total : null), [ds, scope, prevPeriod]);
  const trend = useMemo(
    () => monthsOf(ds).map((m) => ({ ...m, total: summariseLineList(ds, scope, resolvePeriod(`month:${m.month}`, ds.meta)).total })),
    [ds, scope]
  );
  const level = s.breakdown.level;
  /** Filter patch that drills into one breakdown row; null when there is nothing deeper. */
  const drill = (key: string): Partial<LineListFilters> | null => {
    if (level === 'lga') return { stateId: getLga(key)!.stateId, lgaId: key };
    if (level === 'ward') return { wardId: key };
    if (!f.settlementId) {
      const st = ds.settlements.find((x) => x.id === key);
      return st ? { wardId: st.wardId, settlementId: key } : null;
    }
    return null;
  };
  return { f, set, periodKey, period, s, level, drill, prev, prevPeriod, trend };
}

export function useSupervisoryData(ds: Dataset) {
  const f = useFilterStore((s) => s.supervisory);
  const set = useFilterStore((s) => s.setSupervisory);
  const periodKey: PeriodKey = f.period ?? 'this-month';
  const period = useMemo(() => resolvePeriod(periodKey, ds.meta), [periodKey, ds.meta]);
  const scope = useMemo(() => ({ stateId: f.stateId, lgaId: f.lgaId }), [f.stateId, f.lgaId]);
  const sup = useMemo(() => summariseSupervisory(ds, scope, period), [ds, scope, period]);
  const tgt = useMemo(() => summariseTargets(ds, scope, period), [ds, scope, period]);
  const prevPeriod = useMemo(() => previousPeriod(period, ds.meta), [period, ds.meta]);
  const prev = useMemo(
    () => (prevPeriod ? { sup: summariseSupervisory(ds, scope, prevPeriod).total, tgt: summariseTargets(ds, scope, prevPeriod).total } : null),
    [ds, scope, prevPeriod]
  );
  const trend = useMemo(
    () =>
      monthsOf(ds).map((m) => {
        const p = resolvePeriod(`month:${m.month}`, ds.meta);
        return { ...m, sup: summariseSupervisory(ds, scope, p).total, tgt: summariseTargets(ds, scope, p).total };
      }),
    [ds, scope]
  );
  const level = sup.breakdown.level;
  const drill = (key: string): Partial<SupervisoryFilters> | null =>
    level === 'lga' ? { stateId: getLga(key)!.stateId, lgaId: key } : null;
  return { f, set, periodKey, period, scope, sup, tgt, level, drill, prev, prevPeriod, trend };
}

export interface Crumb {
  label: string;
  patch: Partial<LineListFilters> | null;
}

/** Breadcrumb from "All states" down to the current filter, each crumb resetting below it. */
export function crumbs(
  ds: Dataset,
  f: { stateId: string | null; lgaId: string | null; wardId?: string | null; settlementId?: string | null }
): Crumb[] {
  const out: Crumb[] = [{ label: 'All states', patch: { stateId: null } }];
  if (f.stateId) out.push({ label: getState(f.stateId)!.name, patch: { stateId: f.stateId, lgaId: null } });
  if (f.lgaId) out.push({ label: getLga(f.lgaId)!.name, patch: { lgaId: f.lgaId, wardId: null, settlementId: null } });
  if (f.wardId) out.push({ label: ds.wards.find((w) => w.id === f.wardId)?.name ?? 'Ward', patch: { wardId: f.wardId, settlementId: null } });
  if (f.settlementId) out.push({ label: ds.settlements.find((s) => s.id === f.settlementId)?.name ?? 'Settlement', patch: null });
  out[out.length - 1] = { ...out[out.length - 1], patch: null };
  return out;
}

/** The state/LGA part of a crumb patch, for pages without ward or settlement filters. */
export function geoOnly(patch: Partial<LineListFilters>): Partial<SupervisoryFilters> {
  const out: Partial<SupervisoryFilters> = {};
  if ('stateId' in patch) out.stateId = patch.stateId ?? null;
  if ('lgaId' in patch) out.lgaId = patch.lgaId ?? null;
  return out;
}

/** Short name of the selected area, for headlines. */
export function areaName(
  ds: Dataset,
  f: { stateId: string | null; lgaId: string | null; wardId?: string | null; settlementId?: string | null }
): string {
  if (f.settlementId) return ds.settlements.find((s) => s.id === f.settlementId)?.name ?? 'this settlement';
  if (f.wardId) return ds.wards.find((w) => w.id === f.wardId)?.name ?? 'this ward';
  if (f.lgaId) return getLga(f.lgaId)!.name;
  if (f.stateId) return getState(f.stateId)!.name;
  return 'the programme';
}

export function levelPlural(level: Level): string {
  return { lga: 'LGAs', ward: 'wards', settlement: 'settlements' }[level];
}

export { LEVEL_LABEL };

export type Rag = 'good' | 'watch' | 'behind' | 'none';

/** Rate bands used to colour cells: ≥75% on track, 60–75% watch, below 60% behind. */
export function rag(v: number | null, good = 75, watch = 60): Rag {
  if (v === null) return 'none';
  return v >= good ? 'good' : v >= watch ? 'watch' : 'behind';
}

export function waiting(r: LineListRow): number {
  return pathwayRates(r.zdc).notVaccinated + pathwayRates(r.uic).notVaccinated;
}

/** Every programme month, for sparklines; the current month is flagged as partial. */
function monthsOf(ds: Dataset) {
  const now = currentMonth(ds.meta);
  return monthsBetween(ds.meta.firstMonth, now).map((month) => ({
    month,
    label: monthLabel(month, true),
    partial: month === now && resolvePeriod(`month:${month}`, ds.meta).partial,
  }));
}

export interface Delta {
  /** e.g. "+4.2%" or "−1.3 pts". */
  text: string;
  dir: 'up' | 'down' | 'flat';
  /** Whether the change is good news, for the pill colour. */
  good: boolean | null;
}

/**
 * Change against the previous period: percent change for counts, percentage
 * points for rates. `higherIsBetter` decides the colour.
 */
export function delta(cur: number | null, prev: number | null | undefined, kind: 'count' | 'rate', higherIsBetter = true): Delta | null {
  if (cur === null || prev === null || prev === undefined) return null;
  const diff = kind === 'rate' ? cur - prev : prev === 0 ? null : ((cur - prev) / prev) * 100;
  if (diff === null) return null;
  const dir = Math.abs(diff) < 0.05 ? 'flat' : diff > 0 ? 'up' : 'down';
  const sign = diff > 0 ? '+' : diff < 0 ? '−' : '';
  const text = `${sign}${Math.abs(diff).toFixed(1)}${kind === 'rate' ? ' pts' : '%'}`;
  return { text, dir, good: dir === 'flat' ? null : (dir === 'up') === higherIsBetter };
}
