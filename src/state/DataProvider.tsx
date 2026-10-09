import { useEffect, useState, type ReactNode } from 'react';
import { getDataSource } from '@/data/datasource';
import { normalise } from '@/data/normalise';
import { DataContext, type DataState } from './dataContext';

export function DataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DataState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    getDataSource()
      .load()
      .then((raw) => {
        if (!cancelled) setState({ status: 'ready', data: normalise(raw) });
      })
      .catch((err: unknown) => {
        if (!cancelled) setState({ status: 'error', message: err instanceof Error ? err.message : String(err) });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return <DataContext.Provider value={state}>{children}</DataContext.Provider>;
}
