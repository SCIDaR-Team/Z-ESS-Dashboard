import type { DataSource } from './types';
import type {
  ChecklistReport,
  ChildRecord,
  DatasetMeta,
  HouseholdCase,
  RawDataset,
  RumourCase,
  Settlement,
  TargetRow,
  Ward,
} from '../types';

/**
 * Live source. The endpoint paths are placeholders until the Optimus and
 * supervisory-checklist APIs are confirmed; each must return the record shapes
 * in data/types.ts (raw state/LGA names are fine — aliases are resolved on load).
 */
export class ApiDataSource implements DataSource {
  constructor(private baseUrl: string = import.meta.env.VITE_API_BASE_URL ?? '') {}

  private async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`${path}: ${res.status} ${res.statusText}`);
    return (await res.json()) as T;
  }

  async load(): Promise<RawDataset> {
    const [meta, wards, settlements, children, reports, households, rumours, targets] = await Promise.all([
      this.get<DatasetMeta>('/meta'),
      this.get<Ward[]>('/locations/wards'),
      this.get<Settlement[]>('/locations/settlements'),
      this.get<ChildRecord[]>('/optimus/line-list'),
      this.get<ChecklistReport[]>('/checklist/reports'),
      this.get<HouseholdCase[]>('/checklist/households'),
      this.get<RumourCase[]>('/checklist/rumours'),
      this.get<TargetRow[]>('/targets/monthly'),
    ]);
    return { meta: { ...meta, source: 'api' }, wards, settlements, children, reports, households, rumours, targets };
  }
}
