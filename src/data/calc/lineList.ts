import type { Dataset, LinkedChild } from '../normalise';
import type { Period } from '../period';
import { breakdownFor, inScope, subtotalStates, type Breakdown, type Scope } from './scope';
import { pct } from './rates';

/**
 * Optimus line-list calculations (brief §1).
 *
 * The cohort is every unique child identified in the period. Each milestone is
 * counted when it happened on or before the cut-off, so all figures for a
 * period share one cut-off.
 */

export interface PathwayCounts {
  identified: number;
  referred: number;
  /** Identified children with a verified gap-closing dose on/after identification. */
  vaccinated: number;
  /** Referred children with a verified gap-closing dose on/after the referral date. */
  vaccinatedAfterReferral: number;
}

export interface LineListRow {
  key: string;
  label: string;
  stateId: string;
  settlements: number;
  zdc: PathwayCounts;
  uic: PathwayCounts;
}

export interface LineListSummary {
  breakdown: Breakdown;
  rows: LineListRow[];
  /** Per-state subtotals, present only when listing LGAs across all states. */
  stateTotals: LineListRow[];
  total: LineListRow;
}

const emptyCounts = (): PathwayCounts => ({ identified: 0, referred: 0, vaccinated: 0, vaccinatedAfterReferral: 0 });

class Acc {
  settlements = new Set<string>();
  zdc = emptyCounts();
  uic = emptyCounts();
  toRow(key: string, label: string, stateId: string): LineListRow {
    return { key, label, stateId, settlements: this.settlements.size, zdc: { ...this.zdc }, uic: { ...this.uic } };
  }
}

/** Which milestones a child has reached by the cut-off. */
export function milestonesAt(c: LinkedChild, cutoff: string) {
  const referred = c.referralDate !== null && c.referralDate <= cutoff;
  const v = c.verifiedVaccinationDate;
  const vaccinated = v !== null && v >= c.identifiedDate && v <= cutoff;
  const vaccinatedAfterReferral = referred && vaccinated && v! >= c.referralDate!;
  return { referred, vaccinated, vaccinatedAfterReferral };
}

function add(acc: Acc, c: LinkedChild, m: ReturnType<typeof milestonesAt>) {
  acc.settlements.add(c.settlementId);
  const g = c.classification === 'ZDC' ? acc.zdc : acc.uic;
  g.identified++;
  if (m.referred) g.referred++;
  if (m.vaccinated) g.vaccinated++;
  if (m.vaccinatedAfterReferral) g.vaccinatedAfterReferral++;
}

export function summariseLineList(ds: Dataset, scope: Scope, period: Period): LineListSummary {
  const breakdown = breakdownFor(ds, scope, 'ward');
  const accs = new Map(breakdown.rows.map((r) => [r.key, new Acc()]));
  const states = subtotalStates(breakdown, scope);
  const stateAccs = new Map(states.map((s) => [s.id, new Acc()]));
  const total = new Acc();

  for (const c of ds.children) {
    if (c.identifiedDate < period.start || c.identifiedDate > period.cutoff) continue;
    if (!inScope(c, scope)) continue;
    const m = milestonesAt(c, period.cutoff);
    add(total, c, m);
    const acc = accs.get(breakdown.keyOf(c));
    if (acc) add(acc, c, m);
    const sAcc = stateAccs.get(c.stateId);
    if (sAcc) add(sAcc, c, m);
  }

  return {
    breakdown,
    rows: breakdown.rows.map((r) => accs.get(r.key)!.toRow(r.key, r.label, r.stateId)),
    stateTotals: states.map((s) => stateAccs.get(s.id)!.toRow(`state:${s.id}`, `${s.name} total`, s.id)),
    total: total.toRow('total', 'Total', scope.stateId ?? ''),
  };
}

export interface PathwayRates {
  conversion: number | null;
  referralCompletion: number | null;
  /** Identified but not yet vaccinated (the whole follow-up backlog). */
  notVaccinated: number;
  /** Referred − vaccinated after referral (the brief's referral backlog). */
  referredPending: number;
}

export function pathwayRates(c: PathwayCounts): PathwayRates {
  return {
    conversion: pct(c.vaccinated, c.identified),
    referralCompletion: pct(c.vaccinatedAfterReferral, c.referred),
    notVaccinated: c.identified - c.vaccinated,
    referredPending: c.referred - c.vaccinatedAfterReferral,
  };
}
