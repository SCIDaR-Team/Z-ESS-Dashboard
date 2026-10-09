import type { RawDataset } from '../types';

/**
 * Where the dashboard's data comes from. The UI only ever sees a RawDataset,
 * so swapping the mock for the live Optimus / checklist APIs touches nothing
 * else.
 */
export interface DataSource {
  load(): Promise<RawDataset>;
}
