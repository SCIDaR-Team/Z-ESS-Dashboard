import type { Month, TargetRow } from '../types';
import { LGAS, slug } from './geography';

/**
 * Monthly ZDC / UIC targets per LGA.
 *
 * Kano figures are the brief's table (p.5) and apply to every month.
 * Jigawa figures are placeholders for the demonstration state — replace them
 * when real targets are supplied.
 */
const MONTHLY_TARGETS: Record<string, Record<string, { zdc: number; uic: number }>> = {
  kano: {
    'Kano Municipal': { zdc: 236, uic: 374 },
    Fagge: { zdc: 478, uic: 881 },
    Nasarawa: { zdc: 1026, uic: 1767 },
    Gwarzo: { zdc: 858, uic: 1180 },
    Tsanyawa: { zdc: 362, uic: 537 },
    Gabasawa: { zdc: 560, uic: 851 },
    Ungogo: { zdc: 1629, uic: 2253 },
    Albasu: { zdc: 691, uic: 950 },
    Madobi: { zdc: 759, uic: 905 },
    Gwale: { zdc: 802, uic: 1218 },
    Dala: { zdc: 355, uic: 669 },
    'Dawakin Kudu': { zdc: 901, uic: 1184 },
    Bichi: { zdc: 1176, uic: 1588 },
  },
  jigawa: {
    Dutse: { zdc: 520, uic: 780 },
    Hadejia: { zdc: 610, uic: 890 },
    Kazaure: { zdc: 480, uic: 700 },
    Gumel: { zdc: 390, uic: 560 },
    Ringim: { zdc: 550, uic: 810 },
    'Birnin Kudu': { zdc: 700, uic: 1020 },
  },
};

/** One target row per LGA per month — never repeated per transaction or report. */
export function buildTargetRows(months: Month[]): TargetRow[] {
  const rows: TargetRow[] = [];
  for (const month of months) {
    for (const lga of LGAS) {
      const t = MONTHLY_TARGETS[lga.stateId]?.[lga.name];
      if (!t) continue;
      rows.push({ lgaId: `${lga.stateId}:${slug(lga.name)}`, month, zdc: t.zdc, uic: t.uic });
    }
  }
  return rows;
}
