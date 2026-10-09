import type { Dataset } from '@/data/normalise';
import { STATES, getLga, getState, lgasIn } from '@/data/reference/geography';

export interface Option {
  value: string;
  label: string;
}

export const ALL = '__all__';

export const fromOption = (v: string): string | null => (v === ALL ? null : v);
export const toOption = (v: string | null): string => v ?? ALL;

export function stateOptions(): Option[] {
  return [{ value: ALL, label: 'All states' }, ...STATES.map((s) => ({ value: s.id, label: s.name }))];
}

export function lgaOptions(stateId: string | null): Option[] {
  const lgas = lgasIn(stateId);
  const label = (id: string, name: string) => (stateId ? name : `${name} (${getState(getLga(id)!.stateId)!.name})`);
  return [{ value: ALL, label: 'All LGAs' }, ...lgas.map((l) => ({ value: l.id, label: label(l.id, l.name) }))];
}

export function wardOptions(ds: Dataset, lgaId: string | null): Option[] {
  const wards = lgaId ? ds.wards.filter((w) => w.lgaId === lgaId) : [];
  return [{ value: ALL, label: 'All wards' }, ...wards.map((w) => ({ value: w.id, label: w.name }))];
}

export function settlementOptions(ds: Dataset, lgaId: string | null, wardId: string | null): Option[] {
  const list = lgaId
    ? ds.settlements.filter((s) => s.lgaId === lgaId && (!wardId || s.wardId === wardId))
    : [];
  return [
    { value: ALL, label: 'All settlements' },
    ...list.map((s) => ({ value: s.id, label: s.name })).sort((a, b) => a.label.localeCompare(b.label)),
  ];
}

/** Human name for the area the filters select, e.g. "Fagge LGA, Kano". */
export function areaLabel(
  ds: Dataset,
  f: { stateId: string | null; lgaId: string | null; wardId?: string | null; settlementId?: string | null }
): string {
  if (f.settlementId) {
    const s = ds.settlements.find((x) => x.id === f.settlementId);
    return `${s?.name ?? 'Settlement'}, ${getLga(s?.lgaId ?? '')?.name ?? ''}`;
  }
  if (f.wardId) {
    const w = ds.wards.find((x) => x.id === f.wardId);
    return `${w?.name ?? 'Ward'} ward, ${getLga(w?.lgaId ?? '')?.name ?? ''}`;
  }
  if (f.lgaId) {
    const l = getLga(f.lgaId)!;
    return `${l.name} LGA, ${getState(l.stateId)!.name}`;
  }
  if (f.stateId) return `${getState(f.stateId)!.name} State — all LGAs`;
  return 'All states — all LGAs';
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n.toLocaleString('en-NG')} ${n === 1 ? one : many}`;
}
