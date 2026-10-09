import type {
  ChecklistReport,
  ChildRecord,
  DatasetMeta,
  HouseholdCase,
  ISODate,
  RawDataset,
  RumourCase,
  Settlement,
  TargetRow,
  Ward,
} from './types';
import { resolveLga } from './reference/geography';

/** One child after linking: a single row per unique child ID, canonical location ids. */
export interface LinkedChild {
  childId: string;
  classification: ChildRecord['classification'];
  stateId: string;
  lgaId: string;
  wardId: string;
  settlementId: string;
  identifiedDate: ISODate;
  referralDate: ISODate | null;
  /**
   * Date of the verified dose that closes the child's gap (Penta1 for ZDC,
   * Penta3 for UIC). Null when there is no such verified dose.
   */
  verifiedVaccinationDate: ISODate | null;
}

type Located<T> = T & { stateId: string; lgaId: string };

export type Report = Located<ChecklistReport>;
export type Household = Located<HouseholdCase>;
export type Rumour = Located<RumourCase>;

export interface ImportIssue {
  source: 'Optimus line list' | 'Supervisory checklist' | 'Household cases' | 'Rumour cases';
  recordId: string;
  lga: string;
}

export interface Dataset {
  meta: DatasetMeta;
  wards: Ward[];
  settlements: Settlement[];
  children: LinkedChild[];
  reports: Report[];
  households: Household[];
  rumours: Rumour[];
  targets: TargetRow[];
  /** Rows whose state/LGA could not be matched. They are excluded from every count. */
  unresolved: ImportIssue[];
  /** Line-list rows folded into another row for the same child ID. */
  duplicateRowsMerged: number;
}

const GAP_CLOSING_DOSE = { ZDC: 'Penta1', UIC: 'Penta3' } as const;

function milestones(r: ChildRecord): number {
  return (r.referralDate ? 1 : 0) + (r.vaccinationDate ? 1 : 0);
}

/** Keep one row per child: the most recently updated, then the most complete. */
export function linkChildren(records: ChildRecord[]): { rows: ChildRecord[]; merged: number } {
  const best = new Map<string, ChildRecord>();
  for (const r of records) {
    const cur = best.get(r.childId);
    if (
      !cur ||
      r.lastUpdated > cur.lastUpdated ||
      (r.lastUpdated === cur.lastUpdated && milestones(r) > milestones(cur))
    ) {
      best.set(r.childId, r);
    }
  }
  return { rows: [...best.values()], merged: records.length - best.size };
}

function locate<T extends { state: string; lga: string }>(
  rows: T[],
  source: ImportIssue['source'],
  idOf: (r: T) => string,
  unresolved: ImportIssue[]
): Located<T>[] {
  const out: Located<T>[] = [];
  for (const r of rows) {
    const lga = resolveLga(r.lga, r.state);
    if (!lga) {
      unresolved.push({ source, recordId: idOf(r), lga: r.lga });
      continue;
    }
    out.push({ ...r, stateId: lga.stateId, lgaId: lga.id });
  }
  return out;
}

export function normalise(raw: RawDataset): Dataset {
  const unresolved: ImportIssue[] = [];
  const located = locate(raw.children, 'Optimus line list', (r) => r.recordId, unresolved);
  const { rows, merged } = linkChildren(located);
  const children: LinkedChild[] = (rows as Located<ChildRecord>[]).map((r) => ({
    childId: r.childId,
    classification: r.classification,
    stateId: r.stateId,
    lgaId: r.lgaId,
    wardId: r.wardId,
    settlementId: r.settlementId,
    identifiedDate: r.identifiedDate,
    referralDate: r.referralDate,
    verifiedVaccinationDate:
      r.verificationStatus === 'verified' &&
      r.vaccinationDate &&
      r.antigenDose === GAP_CLOSING_DOSE[r.classification]
        ? r.vaccinationDate
        : null,
  }));

  return {
    meta: raw.meta,
    wards: raw.wards,
    settlements: raw.settlements,
    children,
    reports: locate(raw.reports, 'Supervisory checklist', (r) => r.reportId, unresolved),
    households: locate(raw.households, 'Household cases', (r) => r.caseId, unresolved),
    rumours: locate(raw.rumours, 'Rumour cases', (r) => r.caseId, unresolved),
    targets: raw.targets,
    unresolved,
    duplicateRowsMerged: merged,
  };
}
