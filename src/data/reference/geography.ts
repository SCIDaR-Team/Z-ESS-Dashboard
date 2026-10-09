/**
 * State → LGA hierarchy and the name aliases used when importing Optimus and
 * checklist data.
 *
 * Kano's 13 LGAs and their aliases come from the build brief (p.5). Jigawa is a
 * demonstration state: it exists so the State filter has something to switch
 * between until the real programme states are confirmed. Its LGA names are real,
 * its targets are not (see targets.ts).
 */

export interface StateDef {
  id: string;
  name: string;
  /** True while the state is a placeholder rather than a confirmed programme state. */
  demo?: boolean;
}

export interface LgaDef {
  id: string;
  name: string;
  stateId: string;
}

export const STATES: StateDef[] = [
  { id: 'kano', name: 'Kano' },
  { id: 'jigawa', name: 'Jigawa', demo: true },
];

const LGA_NAMES: Record<string, string[]> = {
  // Order follows the brief's target table.
  kano: [
    'Kano Municipal',
    'Fagge',
    'Nasarawa',
    'Gwarzo',
    'Tsanyawa',
    'Gabasawa',
    'Ungogo',
    'Albasu',
    'Madobi',
    'Gwale',
    'Dala',
    'Dawakin Kudu',
    'Bichi',
  ],
  jigawa: ['Dutse', 'Hadejia', 'Kazaure', 'Gumel', 'Ringim', 'Birnin Kudu'],
};

export function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export const LGAS: LgaDef[] = STATES.flatMap((st) =>
  LGA_NAMES[st.id].map((name) => ({ id: `${st.id}:${slug(name)}`, name, stateId: st.id }))
);

const LGA_BY_ID = new Map(LGAS.map((l) => [l.id, l]));
const STATE_BY_ID = new Map(STATES.map((s) => [s.id, s]));

export function getLga(id: string): LgaDef | undefined {
  return LGA_BY_ID.get(id);
}

export function getState(id: string): StateDef | undefined {
  return STATE_BY_ID.get(id);
}

/** LGAs in a state, or every LGA when stateId is null ("All states"). */
export function lgasIn(stateId: string | null): LgaDef[] {
  return stateId ? LGAS.filter((l) => l.stateId === stateId) : LGAS;
}

/** Spelling variants seen in source data → canonical LGA name (brief p.5). */
const LGA_ALIASES: Record<string, string> = {
  kmc: 'Kano Municipal',
  'kano municipal': 'Kano Municipal',
  'kano municipality': 'Kano Municipal',
  'd/kudu': 'Dawakin Kudu',
  'd kudu': 'Dawakin Kudu',
  'dawakin-kudu': 'Dawakin Kudu',
  dawakinkudu: 'Dawakin Kudu',
  ungoggo: 'Ungogo',
  nassarawa: 'Nasarawa',
  'b/kudu': 'Birnin Kudu',
};

function normaliseName(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ');
}

const STATE_ALIASES: Record<string, string> = { kano: 'kano', 'kano state': 'kano', jigawa: 'jigawa', 'jigawa state': 'jigawa' };

export function resolveState(raw: string | null | undefined): StateDef | undefined {
  if (!raw) return undefined;
  const id = STATE_ALIASES[normaliseName(raw)];
  return id ? STATE_BY_ID.get(id) : undefined;
}

/**
 * Map a raw LGA name to its canonical LGA. The state narrows the match when it
 * is known; without it the name must be unique across states.
 */
export function resolveLga(raw: string | null | undefined, stateRaw?: string | null): LgaDef | undefined {
  if (!raw) return undefined;
  const key = normaliseName(raw);
  const canonical = normaliseName(LGA_ALIASES[key] ?? raw);
  const state = resolveState(stateRaw ?? null);
  const matches = LGAS.filter((l) => normaliseName(l.name) === canonical && (!state || l.stateId === state.id));
  return matches.length === 1 ? matches[0] : undefined;
}
