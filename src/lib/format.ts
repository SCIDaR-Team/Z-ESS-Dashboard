const intFmt = new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 });

export function fmtInt(n: number | null | undefined): string {
  return n === null || n === undefined ? '—' : intFmt.format(n);
}

export function fmtPct(n: number | null | undefined, digits = 1): string {
  return n === null || n === undefined ? '—' : `${n.toFixed(digits)}%`;
}

/** "8 Oct 2026, 18:30" in the user's locale and timezone. */
export function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
