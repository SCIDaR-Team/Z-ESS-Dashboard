import type { Dataset, Report } from '../normalise';
import type { Period } from '../period';
import { ANTIGENS, type Antigen } from '../types';
import { breakdownFor, inScope, subtotalStates, type Breakdown, type Scope } from './scope';
import { pct } from './rates';

/**
 * Supervisory checklist calculations (brief §2).
 *
 * Settlements are distinct. ZDC/UIC are distinct child IDs where the report
 * captured them; a report without IDs contributes its count as submitted.
 * Vaccines are dose totals. Household and rumour cases are the cohort
 * identified in the period, with follow-up/conversion/addressing counted up to
 * the cut-off.
 */

export type Doses = Record<Antigen, number>;

export interface SupervisoryRow {
  key: string;
  label: string;
  stateId: string;
  reports: number;
  settlements: number;
  zdcIdentified: number;
  uicIdentified: number;
  doses: Doses;
  penta1ToZdc: number;
  penta3ToUic: number;
  households: { identified: number; followedUp: number; converted: number };
  rumours: { identified: number; addressed: number };
}

export interface SupervisorySummary {
  breakdown: Breakdown;
  rows: SupervisoryRow[];
  stateTotals: SupervisoryRow[];
  total: SupervisoryRow;
  /** Reports where a ZDC/UIC subset is larger than its dose total. */
  exceptions: SubsetException[];
}

export interface SubsetException {
  reportId: string;
  lgaId: string;
  settlementId: string;
  sessionDate: string;
  dose: 'Penta1' | 'Penta3';
  subset: number;
  total: number;
}

const zeroDoses = (): Doses => Object.fromEntries(ANTIGENS.map((a) => [a, 0])) as Doses;

class Acc {
  reports = 0;
  settlements = new Set<string>();
  zdcIds = new Set<string>();
  uicIds = new Set<string>();
  zdcNoIds = 0;
  uicNoIds = 0;
  doses = zeroDoses();
  penta1ToZdc = 0;
  penta3ToUic = 0;
  hh = { identified: 0, followedUp: 0, converted: 0 };
  rm = { identified: 0, addressed: 0 };

  addReport(r: Report) {
    this.reports++;
    this.settlements.add(r.settlementId);
    if (r.zdcChildIds) r.zdcChildIds.forEach((id) => this.zdcIds.add(id));
    else this.zdcNoIds += r.zdcIdentified;
    if (r.uicChildIds) r.uicChildIds.forEach((id) => this.uicIds.add(id));
    else this.uicNoIds += r.uicIdentified;
    for (const a of ANTIGENS) this.doses[a] += r.doses[a] ?? 0;
    this.penta1ToZdc += r.penta1ToZdc;
    this.penta3ToUic += r.penta3ToUic;
  }

  toRow(key: string, label: string, stateId: string): SupervisoryRow {
    return {
      key,
      label,
      stateId,
      reports: this.reports,
      settlements: this.settlements.size,
      zdcIdentified: this.zdcIds.size + this.zdcNoIds,
      uicIdentified: this.uicIds.size + this.uicNoIds,
      doses: { ...this.doses },
      penta1ToZdc: this.penta1ToZdc,
      penta3ToUic: this.penta3ToUic,
      households: { ...this.hh },
      rumours: { ...this.rm },
    };
  }
}

export function summariseSupervisory(
  ds: Dataset,
  scope: Pick<Scope, 'stateId' | 'lgaId'>,
  period: Period,
  opts: { lgaLevel?: boolean } = {}
): SupervisorySummary {
  const breakdown = opts.lgaLevel
    ? breakdownFor(ds, { stateId: scope.stateId, lgaId: null }, 'settlement')
    : breakdownFor(ds, scope, 'settlement');
  if (opts.lgaLevel && scope.lgaId) breakdown.rows = breakdown.rows.filter((r) => r.key === scope.lgaId);

  const accs = new Map(breakdown.rows.map((r) => [r.key, new Acc()]));
  const states = subtotalStates(breakdown, scope);
  const stateAccs = new Map(states.map((s) => [s.id, new Acc()]));
  const total = new Acc();
  const months = new Set(period.months);
  const exceptions: SubsetException[] = [];

  const targetsOf = (loc: { stateId: string; lgaId: string; settlementId: string }) =>
    [total, accs.get(breakdown.keyOf(loc)), stateAccs.get(loc.stateId)].filter(Boolean) as Acc[];

  for (const r of ds.reports) {
    if (!months.has(r.period) || r.sessionDate > period.cutoff || !inScope(r, scope)) continue;
    for (const acc of targetsOf(r)) acc.addReport(r);
    const p1 = r.doses.Penta1 ?? 0;
    const p3 = r.doses.Penta3 ?? 0;
    const base = { reportId: r.reportId, lgaId: r.lgaId, settlementId: r.settlementId, sessionDate: r.sessionDate };
    if (r.penta1ToZdc > p1) exceptions.push({ ...base, dose: 'Penta1', subset: r.penta1ToZdc, total: p1 });
    if (r.penta3ToUic > p3) exceptions.push({ ...base, dose: 'Penta3', subset: r.penta3ToUic, total: p3 });
  }

  const inPeriod = (d: string) => d >= period.start && d <= period.cutoff;
  const done = (d: string | null) => d !== null && d <= period.cutoff;

  for (const h of ds.households) {
    if (!inPeriod(h.identifiedDate) || !inScope(h, scope)) continue;
    const followedUp = done(h.followedUpDate);
    const converted = followedUp && done(h.convertedDate);
    for (const acc of targetsOf(h)) {
      acc.hh.identified++;
      if (followedUp) acc.hh.followedUp++;
      if (converted) acc.hh.converted++;
    }
  }
  for (const rm of ds.rumours) {
    if (!inPeriod(rm.identifiedDate) || !inScope(rm, scope)) continue;
    const addressed = done(rm.addressedDate);
    for (const acc of targetsOf(rm)) {
      acc.rm.identified++;
      if (addressed) acc.rm.addressed++;
    }
  }

  return {
    breakdown,
    rows: breakdown.rows.map((r) => accs.get(r.key)!.toRow(r.key, r.label, r.stateId)),
    stateTotals: states.map((s) => stateAccs.get(s.id)!.toRow(`state:${s.id}`, `${s.name} total`, s.id)),
    total: total.toRow('total', 'Total', scope.stateId ?? ''),
    exceptions,
  };
}

export function supervisoryRates(r: SupervisoryRow) {
  return {
    penta1ZdcShare: pct(r.penta1ToZdc, r.doses.Penta1),
    penta3UicShare: pct(r.penta3ToUic, r.doses.Penta3),
    householdConversion: pct(r.households.converted, r.households.followedUp),
    rumourResolution: pct(r.rumours.addressed, r.rumours.identified),
  };
}
