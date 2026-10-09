import type {
  Antigen,
  ChecklistReport,
  ChildClass,
  ChildRecord,
  HouseholdCase,
  ISODate,
  Month,
  RawDataset,
  RumourCase,
  Settlement,
  VerificationStatus,
  Ward,
} from '../types';
import { LGAS, getState, type LgaDef } from '../reference/geography';
import { buildTargetRows } from '../reference/targets';
import { addDays, daysInMonth, monthOf, monthStart, monthsBetween } from '../period';

/**
 * Seeded demonstration data, shaped like the real Optimus line list and
 * supervisory checklist exports. The same seed always produces the same data,
 * so tests and screenshots are stable.
 *
 * It deliberately includes the mess the dashboard has to cope with: duplicate
 * child rows, aliased LGA names, an unknown LGA, vaccinations still awaiting
 * verification, LGAs with no reports this month, checklist reports without
 * child IDs, and a few reports where the ZDC/UIC subset exceeds the dose total.
 */

export interface MockOptions {
  seed?: number;
  asOf?: ISODate;
  firstMonth?: Month;
}

export const MOCK_DEFAULTS = {
  seed: 20261006,
  asOf: '2026-10-08',
  firstMonth: '2026-07',
} as const;

/** LGAs that submit no checklist reports in the current month. */
export const MOCK_SILENT_LGAS = ['kano:tsanyawa', 'jigawa:gumel'];

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SETTLEMENT_PREFIX = ['Unguwar', 'Kofar', 'Gidan', 'Tudun', 'Sabon', 'Yan', 'Rijiyar', 'Kauyen', 'Dutsen', 'Bakin'];
const SETTLEMENT_ROOT = [
  'Kuka', 'Dorawa', 'Zango', 'Rimi', 'Gabas', 'Yamma', 'Liman', 'Sarki', 'Gona', 'Kasuwa', 'Mallam', 'Fulani',
  'Tsamiya', 'Kanya', 'Goruba', 'Baure', 'Marke', 'Gawo', 'Kadai', 'Dinya', 'Kurmi', 'Madaki', 'Galadima', 'Wambai',
];
const WARD_SUFFIX = ['Central', 'North', 'South', 'East', 'West', 'Arewa', 'Kudu', 'Gabas', 'Yamma'];

export function generateMockDataset(opts: MockOptions = {}): RawDataset {
  const seed = opts.seed ?? MOCK_DEFAULTS.seed;
  const asOf = opts.asOf ?? MOCK_DEFAULTS.asOf;
  const firstMonth = opts.firstMonth ?? MOCK_DEFAULTS.firstMonth;
  const rnd = mulberry32(seed);
  const between = (lo: number, hi: number) => lo + rnd() * (hi - lo);
  const int = (lo: number, hi: number) => Math.floor(between(lo, hi + 1));
  const chance = (p: number) => rnd() < p;
  const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rnd() * arr.length)];

  const months = monthsBetween(firstMonth, monthOf(asOf));
  const currentMonth = months[months.length - 1];
  const targets = buildTargetRows(months);

  // ── Locations ────────────────────────────────────────────────────────────
  const wards: Ward[] = [];
  const settlements: Settlement[] = [];
  const settlementsByLga = new Map<string, { s: Settlement; cum: number }[]>();
  for (const lga of LGAS) {
    const nWards = int(3, 9);
    const pool: { s: Settlement; cum: number }[] = [];
    let cum = 0;
    for (let w = 0; w < nWards; w++) {
      const ward: Ward = { id: `${lga.id}:w${w + 1}`, name: `${lga.name} ${WARD_SUFFIX[w]}`, lgaId: lga.id };
      wards.push(ward);
      const used = new Set<string>();
      const nSett = int(8, 22);
      for (let s = 0; s < nSett; s++) {
        let name = `${pick(SETTLEMENT_PREFIX)} ${pick(SETTLEMENT_ROOT)}`;
        while (used.has(name)) name = `${pick(SETTLEMENT_PREFIX)} ${pick(SETTLEMENT_ROOT)}`;
        used.add(name);
        const st: Settlement = { id: `${ward.id}:s${s + 1}`, name, wardId: ward.id, lgaId: lga.id };
        settlements.push(st);
        // ~8% of settlements are never reached, so "settlements covered" is below the total.
        const weight = chance(0.08) ? 0 : between(0.3, 1.7);
        if (weight > 0) {
          cum += weight;
          pool.push({ s: st, cum });
        }
      }
    }
    settlementsByLga.set(lga.id, pool);
  }
  const pickSettlement = (lgaId: string): Settlement => {
    const pool = settlementsByLga.get(lgaId)!;
    const x = rnd() * pool[pool.length - 1].cum;
    let lo = 0;
    let hi = pool.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (pool[mid].cum < x) lo = mid + 1;
      else hi = mid;
    }
    return pool[lo].s;
  };

  const rawLgaName = (lga: LgaDef): string => {
    if (lga.name === 'Kano Municipal' && chance(0.5)) return 'KMC';
    if (lga.name === 'Dawakin Kudu' && chance(0.4)) return 'D/Kudu';
    if (lga.name === 'Ungogo' && chance(0.25)) return 'Ungoggo';
    if (lga.name === 'Nasarawa' && chance(0.25)) return 'Nassarawa';
    return lga.name;
  };
  const rawStateName = (lga: LgaDef) => {
    const name = getState(lga.stateId)!.name;
    return chance(0.3) ? `${name} State` : name;
  };
  const cap = (d: ISODate | null): ISODate | null => (d && d <= asOf ? d : null);
  const maxDate = (...ds: (ISODate | null)[]) => ds.filter(Boolean).sort().pop() as ISODate;

  // ── Optimus line list ────────────────────────────────────────────────────
  const children: ChildRecord[] = [];
  const canonical: ChildRecord[] = [];
  let childSeq = 0;
  let recordSeq = 0;

  // Each LGA gets its own performance level, so referral and conversion vary between LGAs.
  const perf = new Map(LGAS.map((l) => [l.id, rnd()]));

  // A couple of LGA-months over target, so achievement is visibly not capped at 100%.
  const overTarget = new Set(['kano:kano-municipal|2026-09|ZDC', 'kano:dala|2026-08|UIC', 'jigawa:hadejia|2026-09|ZDC']);

  for (const month of months) {
    const days = daysInMonth(month);
    const lastDay = month === currentMonth ? Number(asOf.slice(8, 10)) : days;
    const fraction = lastDay / days;
    for (const lga of LGAS) {
      const t = targets.find((r) => r.lgaId === lga.id && r.month === month);
      if (!t) continue;
      for (const cls of ['ZDC', 'UIC'] as ChildClass[]) {
        const factor = overTarget.has(`${lga.id}|${month}|${cls}`) ? between(1.05, 1.15) : between(0.35, 0.9);
        const n = Math.round((cls === 'ZDC' ? t.zdc : t.uic) * factor * fraction);
        for (let i = 0; i < n; i++) {
          const settlement = pickSettlement(lga.id);
          const identifiedDate = addDays(monthStart(month), int(0, lastDay - 1));
          let referralDate: ISODate | null = null;
          let vaccinationDate: ISODate | null = null;
          const p = perf.get(lga.id)!;
          if (chance(0.78 + 0.18 * p - (cls === 'UIC' ? 0.02 : 0))) {
            referralDate = cap(addDays(identifiedDate, int(0, 3)));
          }
          if (referralDate) {
            if (chance(0.02)) {
              // Vaccinated on the day of identification, before the referral was logged.
              vaccinationDate = identifiedDate;
              referralDate = addDays(identifiedDate, 1) <= asOf ? addDays(identifiedDate, 1) : referralDate;
            } else if (chance(0.66 + 0.29 * p)) {
              // Most referred children are vaccinated within a week; a tail takes up to three.
              vaccinationDate = cap(addDays(referralDate, Math.floor(rnd() ** 2.5 * 21)));
            }
          } else if (chance(0.3)) {
            vaccinationDate = cap(addDays(identifiedDate, int(0, 21)));
          }
          let verificationStatus: VerificationStatus = 'pending';
          let verificationSource: string | null = null;
          if (vaccinationDate) {
            const v = rnd();
            verificationStatus = v < 0.93 ? 'verified' : v < 0.98 ? 'pending' : 'rejected';
            verificationSource = chance(0.6) ? 'Child health card' : 'Facility register';
          }
          const rec: ChildRecord = {
            recordId: `OPT-${++recordSeq}`,
            childId: `ZE-${lga.stateId.slice(0, 2).toUpperCase()}-${String(++childSeq).padStart(6, '0')}`,
            classification: cls,
            state: rawStateName(lga),
            lga: rawLgaName(lga),
            wardId: settlement.wardId,
            settlementId: settlement.id,
            identifiedDate,
            referralDate,
            vaccinationDate,
            antigenDose: vaccinationDate ? (cls === 'ZDC' ? 'Penta1' : 'Penta3') : null,
            verificationStatus,
            verificationSource,
            lastUpdated: maxDate(identifiedDate, referralDate, vaccinationDate),
          };
          children.push(rec);
          canonical.push(rec);
          // ~3% of children also have an older, less complete row.
          if (chance(0.03)) {
            children.push({
              ...rec,
              recordId: `OPT-${++recordSeq}`,
              referralDate: null,
              vaccinationDate: null,
              antigenDose: null,
              verificationStatus: 'pending',
              verificationSource: null,
              lastUpdated: identifiedDate,
            });
          }
        }
      }
    }
  }
  // Rows whose LGA can't be matched — reported as import exceptions, never counted.
  for (let i = 0; i < 6; i++) {
    const base = canonical[int(0, canonical.length - 1)];
    children.push({ ...base, recordId: `OPT-${++recordSeq}`, childId: `ZE-XX-${900000 + i}`, lga: 'Kano Central' });
  }

  // ── Supervisory checklist ────────────────────────────────────────────────
  const settlementById = new Map(settlements.map((s) => [s.id, s]));
  const groups = new Map<string, ChildRecord[]>();
  for (const c of canonical) {
    const key = `${c.settlementId}|${monthOf(c.identifiedDate)}`;
    const g = groups.get(key);
    if (g) g.push(c);
    else groups.set(key, [c]);
  }

  const reports: ChecklistReport[] = [];
  const households: HouseholdCase[] = [];
  const rumours: RumourCase[] = [];
  let reportSeq = 0;
  let caseSeq = 0;
  // Doses given to identified children are recorded at the session in the month they were given,
  // whenever the child was identified.
  const dosesGiven = new Map<string, { zdc: number; uic: number }>();
  for (const c of canonical) {
    if (c.verificationStatus !== 'verified' || !c.vaccinationDate) continue;
    const key = `${c.settlementId}|${monthOf(c.vaccinationDate)}`;
    const d = dosesGiven.get(key) ?? { zdc: 0, uic: 0 };
    if (c.classification === 'ZDC') d.zdc++;
    else d.uic++;
    dosesGiven.set(key, d);
  }

  for (const [key, kids] of groups) {
    const [settlementId, month] = key.split('|');
    const settlement = settlementById.get(settlementId)!;
    const lga = LGAS.find((l) => l.id === settlement.lgaId)!;
    if (month === currentMonth && MOCK_SILENT_LGAS.includes(lga.id)) continue;

    const lastDay = month === currentMonth ? Number(asOf.slice(8, 10)) : daysInMonth(month);
    const nSessions = chance(0.3) && kids.length > 3 ? 2 : 1;
    const buckets: ChildRecord[][] = Array.from({ length: nSessions }, () => []);
    kids.forEach((k) => buckets[Math.floor(rnd() * nSessions)].push(k));
    if (nSessions === 2) {
      // A few children are recorded again at the second visit.
      for (const k of buckets[0]) if (chance(0.04)) buckets[1].push(k);
    }

    const given = dosesGiven.get(key) ?? { zdc: 0, uic: 0 };
    const share = (n: number, idx: number) => (idx === nSessions - 1 ? n - Math.floor(n / nSessions) * (nSessions - 1) : Math.floor(n / nSessions));

    buckets.forEach((bucket, idx) => {
      if (bucket.length === 0) return;
      const zdc = bucket.filter((k) => k.classification === 'ZDC');
      const uic = bucket.filter((k) => k.classification === 'UIC');
      const withIds = !chance(0.08);
      const penta1ToZdc = share(given.zdc, idx);
      const penta3ToUic = share(given.uic, idx);
      // Routine doses to children outside the ZDC/UIC cohorts.
      const p1 = penta1ToZdc + int(1, 4);
      const p3 = penta3ToUic + int(1, 5);
      const doses: Partial<Record<Antigen, number>> = {
        Penta1: p1,
        Penta3: p3,
        IPV1: Math.round(p1 * between(0.8, 1)),
        IPV2: Math.round(p3 * between(0.6, 0.9)),
        OPV1: Math.round(p1 * between(0.9, 1.1)),
        OPV2: Math.round(p1 * between(0.7, 0.95)),
        MCV1: int(3, 15),
        MCV2: int(2, 10),
        BCG: int(2, 12),
        HPV: int(0, 8),
        Malaria: int(0, 10),
      };
      const sessionDate = addDays(monthStart(month), int(0, lastDay - 1));
      const report: ChecklistReport = {
        reportId: `CHK-${String(++reportSeq).padStart(6, '0')}`,
        period: month,
        sessionId: `${settlementId}:${month}:s${idx + 1}`,
        sessionDate,
        state: rawStateName(lga),
        lga: rawLgaName(lga),
        settlementId,
        submitter: `SUP-${lga.name.slice(0, 3).toUpperCase()}-${int(1, 6)}`,
        zdcIdentified: zdc.length,
        uicIdentified: uic.length,
        doses,
        penta1ToZdc,
        penta3ToUic,
      };
      if (withIds) {
        report.zdcChildIds = zdc.map((k) => k.childId);
        report.uicChildIds = uic.map((k) => k.childId);
      }
      reports.push(report);

      const nHouseholds = rnd() < 0.35 ? 0 : int(1, 5);
      for (let h = 0; h < nHouseholds; h++) {
        const followedUpDate = chance(0.86) ? cap(addDays(sessionDate, int(0, 5))) : null;
        const convertedDate = followedUpDate && chance(0.55 + 0.3 * perf.get(lga.id)!) ? cap(addDays(followedUpDate, int(0, 6))) : null;
        households.push({
          caseId: `HH-${String(++caseSeq).padStart(6, '0')}`,
          state: report.state,
          lga: report.lga,
          settlementId,
          identifiedDate: sessionDate,
          followedUpDate,
          convertedDate,
        });
      }
      const nRumours = rnd() < 0.7 ? 0 : chance(0.85) ? 1 : 2;
      for (let r = 0; r < nRumours; r++) {
        rumours.push({
          caseId: `RM-${String(++caseSeq).padStart(6, '0')}`,
          state: report.state,
          lga: report.lga,
          settlementId,
          identifiedDate: sessionDate,
          addressedDate: chance(0.87) ? cap(addDays(sessionDate, int(0, 4))) : null,
        });
      }
    });
  }

  // Entry errors the dashboard must flag: subset larger than the total.
  const flaggable = reports.filter((r) => r.penta1ToZdc >= 3 && r.penta3ToUic >= 3);
  if (flaggable.length >= 3) {
    flaggable[0].doses.Penta1 = flaggable[0].penta1ToZdc - 2;
    flaggable[Math.floor(flaggable.length / 2)].doses.Penta1 = flaggable[Math.floor(flaggable.length / 2)].penta1ToZdc - 1;
    flaggable[flaggable.length - 1].doses.Penta3 = flaggable[flaggable.length - 1].penta3ToUic - 1;
  }

  return {
    meta: {
      asOf,
      lastRefresh: `${asOf}T18:30:00+01:00`,
      firstMonth,
      source: 'mock',
    },
    wards,
    settlements,
    children,
    reports,
    households,
    rumours,
    targets,
  };
}
