import { describe, expect, it } from 'vitest';
import { generateMockDataset, MOCK_SILENT_LGAS } from './generate';
import { normalise } from '../normalise';
import { resolvePeriod, currentMonth, type PeriodKey } from '../period';
import { summariseLineList } from '../calc/lineList';
import { summariseSupervisory } from '../calc/supervisory';
import { summariseTargets } from '../calc/targets';
import { lgasIn, STATES } from '../reference/geography';

/** The brief's acceptance checks (p.6), run against the full mock dataset. */
const ds = normalise(generateMockDataset());
const periods: PeriodKey[] = ['to-date', 'complete', `month:${currentMonth(ds.meta)}`, 'month:2026-08'];
const scopes = [{ stateId: null, lgaId: null }, ...STATES.map((s) => ({ stateId: s.id, lgaId: null }))];

describe('mock data acceptance checks', () => {
  it('is deterministic', () => {
    const again = generateMockDataset();
    expect(again.children.length).toBe(generateMockDataset().children.length);
    expect(again.children[100]).toEqual(generateMockDataset().children[100]);
  });

  it('resolves aliases, merges duplicates and isolates unknown LGAs', () => {
    expect(ds.duplicateRowsMerged).toBeGreaterThan(0);
    expect(ds.unresolved.length).toBe(6);
    expect(ds.unresolved.every((u) => u.lga === 'Kano Central')).toBe(true);
  });

  it('shows every LGA for every state filter, including LGAs with no report', () => {
    for (const scope of scopes) {
      for (const key of periods) {
        const p = resolvePeriod(key, ds.meta);
        expect(summariseLineList(ds, scope, p).rows).toHaveLength(lgasIn(scope.stateId).length);
        expect(summariseSupervisory(ds, scope, p).rows).toHaveLength(lgasIn(scope.stateId).length);
        expect(summariseTargets(ds, scope, p).rows).toHaveLength(lgasIn(scope.stateId).length);
      }
    }
    const now = summariseSupervisory(ds, { stateId: null, lgaId: null }, resolvePeriod(`month:${currentMonth(ds.meta)}`, ds.meta));
    for (const id of MOCK_SILENT_LGAS) expect(now.rows.find((r) => r.key === id)?.reports).toBe(0);
  });

  it('never has more post-referral vaccinations than referrals', () => {
    for (const key of periods) {
      const s = summariseLineList(ds, { stateId: null, lgaId: null }, resolvePeriod(key, ds.meta));
      for (const r of [...s.rows, ...s.stateTotals, s.total]) {
        expect(r.zdc.vaccinatedAfterReferral).toBeLessThanOrEqual(r.zdc.referred);
        expect(r.uic.vaccinatedAfterReferral).toBeLessThanOrEqual(r.uic.referred);
        expect(r.zdc.vaccinated).toBeLessThanOrEqual(r.zdc.identified);
      }
    }
  });

  it('flags the injected Penta subset exceptions', () => {
    const s = summariseSupervisory(ds, { stateId: null, lgaId: null }, resolvePeriod('to-date', ds.meta));
    expect(s.exceptions.length).toBe(3);
    expect(s.exceptions.every((e) => e.subset > e.total)).toBe(true);
  });

  it('totals equal the sum of their rows for additive measures', () => {
    const p = resolvePeriod('complete', ds.meta);
    const s = summariseLineList(ds, { stateId: null, lgaId: null }, p);
    const sum = s.rows.reduce((t, r) => t + r.zdc.identified, 0);
    expect(s.total.zdc.identified).toBe(sum);
    expect(s.stateTotals.reduce((t, r) => t + r.settlements, 0)).toBe(s.total.settlements);
  });

  it('has at least one LGA over target, reported uncapped', () => {
    const t = summariseTargets(ds, { stateId: null, lgaId: null }, resolvePeriod('month:2026-09', ds.meta));
    const over = t.rows.filter((r) => (r.zdc.achievement ?? 0) > 100);
    expect(over.length).toBeGreaterThan(0);
    expect(over.every((r) => r.zdc.remaining === 0)).toBe(true);
  });
});
