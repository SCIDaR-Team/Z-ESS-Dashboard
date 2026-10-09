import type { DataSource } from './types';
import { ApiDataSource } from './ApiDataSource';
import { MockDataSource } from './MockDataSource';

export type { DataSource } from './types';

/**
 * Single switch for the data source: VITE_DATA_SOURCE=api reads the live APIs,
 * anything else uses the seeded mock data.
 */
let instance: DataSource | null = null;

export function getDataSource(): DataSource {
  if (instance) return instance;
  instance = import.meta.env.VITE_DATA_SOURCE === 'api' ? new ApiDataSource() : new MockDataSource();
  return instance;
}

/** For tests — inject a custom source. */
export function setDataSource(ds: DataSource): void {
  instance = ds;
}
