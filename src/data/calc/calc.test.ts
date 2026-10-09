import { describe, expect, it } from 'vitest';
import type { ChildRecord, ChecklistReport, RawDataset } from '../types';
import { normalise, linkChildren } from '../normalise';
import { resolvePeriod, previousPeriod } from '../period';
import { summariseLineList, pathwayRates, waitingSplit } from './lineList';
import { summariseSupervisory, supervisoryRates } from './supervisory';
import { summariseTargets, progress } from './targets';
import { resolveLga, lgasIn } from '../reference/geography';
import { buildTargetRows } from '../reference/targets';

const meta = { asOf: '2026-10-08', lastRefresh: '2026-10-08T18:30:00+01:00', firstMonth: '2026-09', source: 'mock' as const };

function child(over: Partial<ChildRecord>): ChildRecord {
  return {
    recordId: 'r',
    childId: 'c',
    classification: 'ZDC',
    state: 'Kano',
    lga: 'Fagge',
    wardId: 'kano:fagge:w1',
    settlementId: 'kano:fagge:w1:s1',
    identifiedDate: '2026-09-05',
    referralDate: null,
    vaccinationDate: null,
    antigenDose: null,
    verificationStatus: 'pending',
    verificationSource: null,
    lastUpdated: '2026-09-05',
    ...over,
  };
}

function report(over: Partial<ChecklistReport>): ChecklistReport {
  return {
    reportId: 'R',
    period: '2026-09',
    sessionId: 's',
    sessionDate: '2026-09-10',
    state: 'Kano',
    lga: 'Fagge',
    settlementId: 'kano:fagge:w1:s1',
    submitter: 'x',
    zdcIdentified: 0,
    uicIdentified: 0,
    doses: { Penta1: 10, Penta3: 10 },
    penta1ToZdc: 0,
    penta3ToUic: 0,
    ...over,
  };
}

function dataset(over: Partial<RawDataset>): RawDataset {
  return {
    meta,
    wards: [{ id: 'kano:fagge:w1', name: 'Fagge Central', lgaId: 'kano:fagge' }],
    settlements: [
      { id: 'kano:fagge:w1:s1', name: 'A', wardId: 'kano:fagge:w1', lgaId: 'kano:fagge' },
      { id: 'kano:fagge:w1:s2', name: 'B', wardId: 'kano:fagge:w1', lgaId: 'kano:fagge' },
    ],
    children: [],
    reports: [],
    households: [],
    rumours: [],
    targets: buildTargetRows(['2026-09', '2026-10']),
    ...over,
  };
}

const sep = resolvePeriod('month:2026-09', meta);
const oct = resolvePeriod('month:2026-10', meta);
const all = { stateId: null, lgaId: null };

describe('geography', () => {
  it('applies the brief’s LGA aliases', () => {
    expect(resolveLga('KMC')?.name).toBe('Kano Municipal');
    expect(resolveLga('D/Kudu')?.name).toBe('Dawakin Kudu');
    expect(resolveLga('Ungoggo')?.name).toBe('Ungogo');
    expect(resolveLga(' nassarawa ', 'Kano State')?.name).toBe('Nasarawa');
    expect(resolveLga('Kano Central')).toBeUndefined();
  });
  it('has 13 Kano LGAs, each with a target', () => {
    expect(lgasIn('kano')).toHaveLength(13);
    const t = buildTargetRows(['2026-09']).filter((r) => r.lgaId.startsWith('kano:'));
    expect(t).toHaveLength(13);
    expect(t.reduce((s, r) => s + r.zdc, 0)).toBe(9833);
    expect(t.reduce((s, r) => s + r.uic, 0)).toBe(14357);
  });
});

describe('period', () => {
  it('marks the current month as partial with the extract date as cut-off', () => {
    expect(oct.partial).toBe(true);
    expect(oct.cutoff).toBe('2026-10-08');
    expect(sep.partial).toBe(false);
    expect(sep.cutoff).toBe('2026-09-30');
  });
});

describe('line list', () => {
  it('links duplicate rows to one child, keeping the latest', () => {
    const { rows, merged } = linkChildren([
      child({ recordId: 'a', lastUpdated: '2026-09-05' }),
      child({ recordId: 'b', lastUpdated: '2026-09-20', referralDate: '2026-09-06' }),
    ]);
    expect(merged).toBe(1);
    expect(rows[0].recordId).toBe('b');
  });

  it('counts conversion and post-referral completion separately', () => {
    const ds = normalise(
      dataset({
        children: [
          // referred, vaccinated after referral
          child({ childId: '1', referralDate: '2026-09-06', vaccinationDate: '2026-09-12', antigenDose: 'Penta1', verificationStatus: 'verified' }),
          // vaccinated before referral: converts, but is not a post-referral completion
          child({ childId: '2', identifiedDate: '2026-09-05', referralDate: '2026-09-07', vaccinationDate: '2026-09-05', antigenDose: 'Penta1', verificationStatus: 'verified' }),
          // referred, vaccination not verified
          child({ childId: '3', referralDate: '2026-09-06', vaccinationDate: '2026-09-12', antigenDose: 'Penta1', verificationStatus: 'pending' }),
          // referred, vaccinated after the cut-off of September
          child({ childId: '4', referralDate: '2026-09-28', vaccinationDate: '2026-10-02', antigenDose: 'Penta1', verificationStatus: 'verified' }),
          // UIC, wrong antigen recorded → not converted
          child({ childId: '5', classification: 'UIC', vaccinationDate: '2026-09-09', antigenDose: 'Penta1', verificationStatus: 'verified' }),
          // other settlement, not referred
          child({ childId: '6', settlementId: 'kano:fagge:w1:s2' }),
        ],
      })
    );
    const s = summariseLineList(ds, all, sep);
    expect(s.total.settlements).toBe(2);
    expect(s.total.zdc).toEqual({ identified: 5, referred: 4, vaccinated: 2, vaccinatedAfterReferral: 1 });
    expect(s.total.uic).toEqual({ identified: 1, referred: 0, vaccinated: 0, vaccinatedAfterReferral: 0 });
    const r = pathwayRates(s.total.zdc);
    expect(r.conversion).toBeCloseTo(40);
    expect(r.referralCompletion).toBeCloseTo(25);
    expect(r.notVaccinated).toBe(3);
    expect(r.referredPending).toBe(3);
    // Waiting = ZDC 3, 4, 6 and UIC 5; of those, 3 and 4 were referred.
    expect(waitingSplit(ds, all, sep)).toEqual({ referred: 2, notReferred: 2 });

    // Same cohort, later cut-off: child 4 now completes.
    const toDate = summariseLineList(ds, all, resolvePeriod('to-date', meta));
    expect(toDate.total.zdc.vaccinatedAfterReferral).toBe(2);
  });

  it('keeps every LGA row — all states, or one state', () => {
    const ds = normalise(dataset({ children: [child({ childId: '1' })] }));
    const allStates = summariseLineList(ds, all, sep);
    expect(allStates.rows).toHaveLength(lgasIn(null).length);
    expect(allStates.stateTotals.map((s) => s.key)).toEqual(['state:kano', 'state:jigawa']);
    const kano = summariseLineList(ds, { stateId: 'kano', lgaId: null }, sep);
    expect(kano.rows).toHaveLength(13);
    expect(kano.stateTotals).toHaveLength(0);
    expect(kano.rows.filter((r) => r.zdc.identified === 0)).toHaveLength(12);
  });

  it('drills from LGA to ward to settlement', () => {
    const ds = normalise(dataset({ children: [child({ childId: '1' })] }));
    expect(summariseLineList(ds, { stateId: 'kano', lgaId: 'kano:fagge' }, sep).breakdown.level).toBe('ward');
    const w = summariseLineList(ds, { stateId: 'kano', lgaId: 'kano:fagge', wardId: 'kano:fagge:w1' }, sep);
    expect(w.breakdown.level).toBe('settlement');
    expect(w.rows.map((r) => r.zdc.identified)).toEqual([1, 0]);
  });
});

describe('supervisory', () => {
  it('counts distinct child IDs, falling back to counts for reports without IDs', () => {
    const ds = normalise(
      dataset({
        reports: [
          report({ reportId: 'a', zdcIdentified: 2, zdcChildIds: ['x', 'y'] }),
          report({ reportId: 'b', zdcIdentified: 2, zdcChildIds: ['y', 'z'], settlementId: 'kano:fagge:w1:s2' }),
          report({ reportId: 'c', zdcIdentified: 3 }),
        ],
      })
    );
    const s = summariseSupervisory(ds, all, sep);
    expect(s.total.zdcIdentified).toBe(3 + 3);
    expect(s.total.settlements).toBe(2);
    expect(s.total.doses.Penta1).toBe(30);
  });

  it('flags a ZDC/UIC subset larger than its dose total', () => {
    const ds = normalise(
      dataset({
        reports: [
          report({ reportId: 'ok', penta1ToZdc: 4 }),
          report({ reportId: 'bad1', penta1ToZdc: 12 }),
          report({ reportId: 'bad3', penta3ToUic: 11 }),
        ],
      })
    );
    const s = summariseSupervisory(ds, all, sep);
    expect(s.exceptions.map((e) => [e.reportId, e.dose])).toEqual([
      ['bad1', 'Penta1'],
      ['bad3', 'Penta3'],
    ]);
  });

  it('computes household conversion among followed-up, and rumour resolution', () => {
    const base = { state: 'Kano', lga: 'Fagge', settlementId: 'kano:fagge:w1:s1', identifiedDate: '2026-09-10' };
    const ds = normalise(
      dataset({
        households: [
          { ...base, caseId: '1', followedUpDate: '2026-09-12', convertedDate: '2026-09-15' },
          { ...base, caseId: '2', followedUpDate: '2026-09-12', convertedDate: null },
          { ...base, caseId: '3', followedUpDate: null, convertedDate: null },
          { ...base, caseId: '4', followedUpDate: '2026-10-02', convertedDate: '2026-10-03' },
        ],
        rumours: [
          { ...base, caseId: 'r1', addressedDate: '2026-09-11' },
          { ...base, caseId: 'r2', addressedDate: null },
        ],
      })
    );
    const s = summariseSupervisory(ds, all, sep);
    expect(s.total.households).toEqual({ identified: 4, followedUp: 2, converted: 1 });
    const r = supervisoryRates(s.total);
    expect(r.householdConversion).toBeCloseTo(50);
    expect(r.rumourResolution).toBeCloseTo(50);
  });
});

describe('targets', () => {
  it('does not cap achievement and floors remaining at zero', () => {
    expect(progress(120, 100)).toEqual({ target: 100, achieved: 120, achievement: 120, remaining: 0 });
    expect(progress(40, 100).remaining).toBe(60);
  });

  it('uses the full-month target for a partial month and sums targets across months', () => {
    const ds = normalise(
      dataset({
        reports: [
          report({ reportId: 'a', period: '2026-10', sessionDate: '2026-10-03', zdcIdentified: 2, zdcChildIds: ['x', 'y'] }),
          report({ reportId: 'b', zdcIdentified: 1, zdcChildIds: ['x'] }),
        ],
      })
    );
    const octT = summariseTargets(ds, { stateId: 'kano', lgaId: 'kano:fagge' }, oct);
    expect(octT.rows).toHaveLength(1);
    expect(octT.rows[0].zdc).toEqual({ target: 478, achieved: 2, achievement: (2 / 478) * 100, remaining: 476 });

    const both = summariseTargets(ds, { stateId: 'kano', lgaId: 'kano:fagge' }, resolvePeriod('to-date', meta));
    // x is counted once across the two months; target is two months of Fagge.
    expect(both.rows[0].zdc.achieved).toBe(2);
    expect(both.rows[0].zdc.target).toBe(478 * 2);
  });

  it('all-LGA achievement sums counts and targets before dividing', () => {
    const ds = normalise(dataset({ reports: [report({ zdcIdentified: 1, zdcChildIds: ['x'] })] }));
    const t = summariseTargets(ds, { stateId: 'kano', lgaId: null }, sep);
    expect(t.rows).toHaveLength(13);
    expect(t.total.zdc.target).toBe(9833);
    expect(t.total.zdc.achievement).toBeCloseTo((1 / 9833) * 100);
  });
});

describe('period filter', () => {
  const m = { ...meta, firstMonth: '2026-07' };
  it('resolves presets against the data cut-off', () => {
    expect(resolvePeriod('this-month', m).months).toEqual(['2026-10']);
    expect(resolvePeriod('this-month', m).partial).toBe(true);
    expect(resolvePeriod('last-month', m).months).toEqual(['2026-09']);
    expect(resolvePeriod('last-3', m).months).toEqual(['2026-07', '2026-08', '2026-09']);
    expect(resolvePeriod('to-date', m).months).toEqual(['2026-07', '2026-08', '2026-09', '2026-10']);
  });
  it('resolves custom ranges, clamped to the programme and swapped if reversed', () => {
    expect(resolvePeriod('range:2026-08:2026-09', m).months).toEqual(['2026-08', '2026-09']);
    expect(resolvePeriod('range:2026-09:2026-08', m).months).toEqual(['2026-08', '2026-09']);
    expect(resolvePeriod('range:2025-01:2027-01', m).months).toEqual(['2026-07', '2026-08', '2026-09', '2026-10']);
    expect(resolvePeriod('range:2026-08:2026-08', m).label).toBe('August 2026');
  });
});

describe('previous period', () => {
  const m = { ...meta, firstMonth: '2026-07' };
  it('compares a partial month with the same days of the month before', () => {
    const prev = previousPeriod(resolvePeriod('this-month', m), m)!;
    expect(prev.months).toEqual(['2026-09']);
    expect(prev.cutoff).toBe('2026-09-08');
    expect(prev.label).toBe('1–8 Sep');
  });
  it('shifts multi-month ranges back by their own length, or gives null before the programme', () => {
    expect(previousPeriod(resolvePeriod('range:2026-09:2026-10', m), m)!.months).toEqual(['2026-07', '2026-08']);
    expect(previousPeriod(resolvePeriod('last-month', m), m)!.label).toBe('Aug 2026');
    expect(previousPeriod(resolvePeriod('to-date', m), m)).toBeNull();
  });
});
