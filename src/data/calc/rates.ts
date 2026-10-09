/**
 * n ÷ d × 100, or null when there is no denominator. Never capped: a value over
 * 100% is reported as it is (brief p.5).
 *
 * Callers pass aggregated counts — rates are always computed after summing,
 * never averaged across rows.
 */
export function pct(n: number, d: number): number | null {
  return d > 0 ? (n / d) * 100 : null;
}
