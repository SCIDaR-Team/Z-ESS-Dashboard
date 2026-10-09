import { createContext, useContext } from 'react';
import type { Dataset } from '@/data/normalise';

export type DataState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: Dataset };

export const DataContext = createContext<DataState>({ status: 'loading' });

export function useData(): DataState {
  return useContext(DataContext);
}
