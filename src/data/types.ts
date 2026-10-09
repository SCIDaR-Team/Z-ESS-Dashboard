/**
 * Source record shapes. They follow the brief's "minimum source fields" (p.6) so
 * the mock generator and the future API return the same thing.
 *
 * Raw records carry state/LGA names as the source spells them; normalise.ts
 * resolves them to canonical ids before anything is counted.
 */

/** Calendar month, 'YYYY-MM'. */
export type Month = string;
/** Calendar date, 'YYYY-MM-DD'. Dates compare correctly as strings. */
export type ISODate = string;

/**
 * ZDC = 12–23 months with no Penta-1.
 * UIC = 12–23 months with Penta-1 but no Penta-3.
 * The two are mutually exclusive.
 */
export type ChildClass = 'ZDC' | 'UIC';

export type VerificationStatus = 'verified' | 'pending' | 'rejected';

/** One row of the Optimus line list. A child may appear on several rows. */
export interface ChildRecord {
  recordId: string;
  childId: string;
  /** Baseline classification at identification. */
  classification: ChildClass;
  state: string;
  lga: string;
  wardId: string;
  settlementId: string;
  identifiedDate: ISODate;
  referralDate: ISODate | null;
  vaccinationDate: ISODate | null;
  /** e.g. 'Penta1', 'Penta3'. */
  antigenDose: string | null;
  verificationStatus: VerificationStatus;
  verificationSource: string | null;
  lastUpdated: ISODate;
}

export const ANTIGENS = [
  'Penta1',
  'Penta3',
  'IPV1',
  'IPV2',
  'OPV1',
  'OPV2',
  'MCV1',
  'MCV2',
  'BCG',
  'HPV',
  'Malaria',
] as const;
export type Antigen = (typeof ANTIGENS)[number];
export const OTHER_ANTIGENS = ANTIGENS.filter((a) => a !== 'Penta1' && a !== 'Penta3');

/** One supervisory checklist submission (one session/visit). */
export interface ChecklistReport {
  reportId: string;
  /** Reporting period the submission belongs to. */
  period: Month;
  sessionId: string;
  sessionDate: ISODate;
  state: string;
  lga: string;
  settlementId: string;
  submitter: string;
  zdcIdentified: number;
  /** Child IDs behind zdcIdentified, when the submission captured them. */
  zdcChildIds?: string[];
  uicIdentified: number;
  uicChildIds?: string[];
  doses: Partial<Record<Antigen, number>>;
  /** Penta1 doses given to identified ZDC — a subset of doses.Penta1. */
  penta1ToZdc: number;
  /** Penta3 doses given to identified UIC — a subset of doses.Penta3. */
  penta3ToUic: number;
}

export interface HouseholdCase {
  caseId: string;
  state: string;
  lga: string;
  settlementId: string;
  identifiedDate: ISODate;
  followedUpDate: ISODate | null;
  convertedDate: ISODate | null;
}

export interface RumourCase {
  caseId: string;
  state: string;
  lga: string;
  settlementId: string;
  identifiedDate: ISODate;
  addressedDate: ISODate | null;
}

export interface TargetRow {
  lgaId: string;
  month: Month;
  zdc: number;
  uic: number;
}

/** Ward / settlement master list. */
export interface Ward {
  id: string;
  name: string;
  lgaId: string;
}
export interface Settlement {
  id: string;
  name: string;
  wardId: string;
  lgaId: string;
}

export interface DatasetMeta {
  /** Data extract cut-off: nothing dated after this is counted. */
  asOf: ISODate;
  /** Timestamp of the last successful refresh (ISO datetime). */
  lastRefresh: string;
  /** First reporting month of the programme. */
  firstMonth: Month;
  source: 'mock' | 'api';
}

export interface RawDataset {
  meta: DatasetMeta;
  wards: Ward[];
  settlements: Settlement[];
  children: ChildRecord[];
  reports: ChecklistReport[];
  households: HouseholdCase[];
  rumours: RumourCase[];
  targets: TargetRow[];
}
