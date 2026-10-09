import type { Dataset } from '../normalise';
import type { Period } from '../period';
import type { Scope } from './scope';
import { summariseSupervisory, type SupervisoryRow } from './supervisory';
import { pct } from './rates';

/**
 * Monthly target progress (brief §3).
 *
 * Achievement = distinct children identified in the period ÷ the sum of the
 * LGA's monthly targets for the months in the period. Not prorated for a
 * partial month and never capped at 100%. Remaining = max(target − achieved, 0).
 * The all-LGA figure sums counts and targets first, then divides.
 */

export interface Progress {
  target: number | null;
  achieved: number;
  achievement: number | null;
  remaining: number | null;
}

export interface TargetProgressRow {
  key: string;
  label: string;
  stateId: string;
  zdc: Progress;
  uic: Progress;
  /** Vaccinated outcomes, shown alongside but separate from achievement. */
  penta1ToZdc: number;
  penta3ToUic: number;
  settlements: number;
}

export interface TargetProgressSummary {
  rows: TargetProgressRow[];
  stateTotals: TargetProgressRow[];
  total: TargetProgressRow;
}

export function progress(achieved: number, target: number | null): Progress {
  return {
    target,
    achieved,
    achievement: target === null ? null : pct(achieved, target),
    remaining: target === null ? null : Math.max(target - achieved, 0),
  };
}

function targetFor(ds: Dataset, lgaId: string, months: string[]) {
  const rows = ds.targets.filter((t) => t.lgaId === lgaId && months.includes(t.month));
  if (rows.length === 0) return null;
  return { zdc: rows.reduce((s, t) => s + t.zdc, 0), uic: rows.reduce((s, t) => s + t.uic, 0) };
}

function combine(key: string, label: string, stateId: string, rows: TargetProgressRow[]): TargetProgressRow {
  const sum = (f: (r: TargetProgressRow) => number) => rows.reduce((s, r) => s + f(r), 0);
  const withTarget = (k: 'zdc' | 'uic') => rows.filter((r) => r[k].target !== null);
  const sumTarget = (k: 'zdc' | 'uic') => {
    const t = withTarget(k);
    return t.length ? t.reduce((s, r) => s + (r[k].target ?? 0), 0) : null;
  };
  // Achievement counts only from LGAs that have a target, so numerator and denominator match.
  const achieved = (k: 'zdc' | 'uic') => withTarget(k).reduce((s, r) => s + r[k].achieved, 0);
  return {
    key,
    label,
    stateId,
    zdc: progress(achieved('zdc'), sumTarget('zdc')),
    uic: progress(achieved('uic'), sumTarget('uic')),
    penta1ToZdc: sum((r) => r.penta1ToZdc),
    penta3ToUic: sum((r) => r.penta3ToUic),
    settlements: sum((r) => r.settlements),
  };
}

export function summariseTargets(
  ds: Dataset,
  scope: Pick<Scope, 'stateId' | 'lgaId'>,
  period: Period
): TargetProgressSummary {
  const sup = summariseSupervisory(ds, scope, period, { lgaLevel: true });
  const rows = sup.rows.map((r: SupervisoryRow): TargetProgressRow => {
    const t = targetFor(ds, r.key, period.months);
    return {
      key: r.key,
      label: r.label,
      stateId: r.stateId,
      zdc: progress(r.zdcIdentified, t?.zdc ?? null),
      uic: progress(r.uicIdentified, t?.uic ?? null),
      penta1ToZdc: r.penta1ToZdc,
      penta3ToUic: r.penta3ToUic,
      settlements: r.settlements,
    };
  });
  const stateTotals = sup.stateTotals.map((s) =>
    combine(s.key, s.label, s.stateId, rows.filter((r) => r.stateId === s.stateId))
  );
  return { rows, stateTotals, total: combine('total', 'Total', scope.stateId ?? '', rows) };
}
