import type { DatasetMeta, ISODate, Month } from './types';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function monthOf(date: ISODate): Month {
  return date.slice(0, 7);
}

export function monthStart(m: Month): ISODate {
  return `${m}-01`;
}

export function daysInMonth(m: Month): number {
  const [y, mo] = m.split('-').map(Number);
  return new Date(Date.UTC(y, mo, 0)).getUTCDate();
}

export function monthEnd(m: Month): ISODate {
  return `${m}-${String(daysInMonth(m)).padStart(2, '0')}`;
}

export function prevMonth(m: Month): Month {
  const [y, mo] = m.split('-').map(Number);
  return mo === 1 ? `${y - 1}-12` : `${y}-${String(mo - 1).padStart(2, '0')}`;
}

export function nextMonth(m: Month): Month {
  const [y, mo] = m.split('-').map(Number);
  return mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, '0')}`;
}

export function monthsBetween(from: Month, to: Month): Month[] {
  const out: Month[] = [];
  for (let m = from; m <= to; m = nextMonth(m)) out.push(m);
  return out;
}

export function addDays(date: ISODate, n: number): ISODate {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function monthLabel(m: Month, short = false): string {
  const [y, mo] = m.split('-').map(Number);
  const name = MONTH_NAMES[mo - 1];
  return `${short ? name.slice(0, 3) : name} ${y}`;
}

export function dateLabel(date: ISODate): string {
  const [y, mo, d] = date.split('-').map(Number);
  return `${d} ${MONTH_NAMES[mo - 1].slice(0, 3)} ${y}`;
}

/**
 * 'this-month'          — the current reporting month, to date.
 * 'last-month'          — the month before it.
 * 'last-3'              — the three most recent complete months.
 * 'to-date'             — every month from programme start to the data cut-off.
 * 'complete'            — every complete month.
 * 'month:YYYY-MM'       — one calendar month.
 * 'range:YYYY-MM:YYYY-MM' — a custom from–to range of months.
 */
export type PeriodKey =
  | 'this-month'
  | 'last-month'
  | 'last-3'
  | 'to-date'
  | 'complete'
  | `month:${string}`
  | `range:${string}:${string}`;

export interface Period {
  key: PeriodKey;
  label: string;
  start: ISODate;
  end: ISODate;
  /** Last date counted: the period end, or the data cut-off if earlier. */
  cutoff: ISODate;
  months: Month[];
  /** True when the cut-off falls before the end of the period's last month. */
  partial: boolean;
}

export function currentMonth(meta: DatasetMeta): Month {
  return monthOf(meta.asOf);
}

export function completeMonths(meta: DatasetMeta): Month[] {
  const months = monthsBetween(meta.firstMonth, currentMonth(meta));
  return months.filter((m) => monthEnd(m) <= meta.asOf);
}

export function resolvePeriod(key: PeriodKey, meta: DatasetMeta): Period {
  let months: Month[];
  let label: string;
  const now = currentMonth(meta);
  const clamp = (m: Month) => (m < meta.firstMonth ? meta.firstMonth : m > now ? now : m);
  if (key === 'this-month') {
    months = [now];
    label = 'This month';
  } else if (key === 'last-month') {
    months = [clamp(prevMonth(now))];
    label = 'Last month';
  } else if (key === 'last-3') {
    months = completeMonths(meta).slice(-3);
    label = 'Last 3 months';
  } else if (key === 'to-date') {
    months = monthsBetween(meta.firstMonth, now);
    label = 'Programme to date';
  } else if (key === 'complete') {
    months = completeMonths(meta);
    label = 'All complete months';
  } else if (key.startsWith('range:')) {
    const [from, to] = key.slice('range:'.length).split(':').map(clamp);
    months = from <= to ? monthsBetween(from, to) : monthsBetween(to, from);
    label = months.length === 1 ? monthLabel(months[0]) : `${monthLabel(months[0], true)} – ${monthLabel(months[months.length - 1], true)}`;
  } else {
    months = [clamp(key.slice('month:'.length))];
    label = monthLabel(months[0]);
  }
  if (months.length === 0) months = [currentMonth(meta)];
  const start = monthStart(months[0]);
  const end = monthEnd(months[months.length - 1]);
  const cutoff = end < meta.asOf ? end : meta.asOf;
  return { key, label, start, end, cutoff, months, partial: cutoff < end };
}

/**
 * The period just before `p`, with the same number of months. When `p` is
 * partial, the comparison stops at the same day of the month, so both sides
 * have had the same time to follow children up. Null when it would start
 * before the programme did.
 */
export function previousPeriod(p: Period, meta: DatasetMeta): Period | null {
  const n = p.months.length;
  let first = p.months[0];
  for (let i = 0; i < n; i++) first = prevMonth(first);
  if (first < meta.firstMonth) return null;
  const months = monthsBetween(first, prevMonth(p.months[0]));
  const last = months[months.length - 1];
  const start = monthStart(first);
  const end = monthEnd(last);
  let cutoff = end;
  if (p.partial) {
    const day = Math.min(Number(p.cutoff.slice(8, 10)), daysInMonth(last));
    cutoff = `${last}-${String(day).padStart(2, '0')}`;
  }
  const short = (m: Month) => monthLabel(m, true).slice(0, 3);
  const label =
    n > 1
      ? `${short(first)} – ${monthLabel(last, true)}`
      : cutoff < end
        ? `1–${Number(cutoff.slice(8, 10))} ${short(last)}`
        : monthLabel(last, true);
  return { key: p.key, label, start, end, cutoff, months, partial: cutoff < end };
}

/** Short description of the dates a period covers, e.g. "1 Jul – 8 Oct 2026". */
export function periodRangeLabel(p: Period): string {
  return `${dateLabel(p.start)} – ${dateLabel(p.cutoff)}`;
}

export interface PeriodOption {
  key: PeriodKey;
  label: string;
}

/** Quick picks for the Period filter; anything else is a custom range. */
export function periodPresets(meta: DatasetMeta): PeriodOption[] {
  const now = currentMonth(meta);
  const opts: PeriodOption[] = [{ key: 'this-month', label: 'This month' }];
  if (prevMonth(now) >= meta.firstMonth) opts.push({ key: 'last-month', label: 'Last month' });
  if (completeMonths(meta).length > 1) opts.push({ key: 'last-3', label: 'Last 3 months' });
  opts.push({ key: 'to-date', label: 'Programme to date' });
  return opts;
}

export function isRange(key: PeriodKey): key is `range:${string}:${string}` {
  return key.startsWith('range:');
}

export function rangeKey(from: Month, to: Month): PeriodKey {
  return `range:${from}:${to}`;
}

/** The month the report is for: always the current reporting month. */
export function reportingMonthLabel(meta: DatasetMeta): string {
  const now = currentMonth(meta);
  return monthEnd(now) <= meta.asOf ? monthLabel(now) : `${monthLabel(now)} (month to date)`;
}
