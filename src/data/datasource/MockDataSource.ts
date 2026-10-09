import type { DataSource } from './types';
import type { RawDataset } from '../types';
import { generateMockDataset } from '../mock/generate';

/** Seeded demonstration data, generated in the browser. */
export class MockDataSource implements DataSource {
  async load(): Promise<RawDataset> {
    return generateMockDataset();
  }
}
