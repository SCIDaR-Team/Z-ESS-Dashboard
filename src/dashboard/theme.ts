import type { Rag } from './common';

/**
 * Dashboard palette. Navy carries the frame, blue is zero-dose (and the one
 * accent), teal is under-immunised; green/amber/red are reserved for status.
 */
export const PALETTE = {
  navy: '#204F3F',
  ink: '#253E33',
  soft: '#657264',
  mute: '#93A28C',
  line: '#E4E9DF',
  page: '#F6F7F3',
  zdc: '#597DC2',
  zdcLight: '#E8EEF9',
  uic: '#37896F',
  uicLight: '#E4F1E8',
  green: '#3E8C65',
  amber: '#C49E50',
  red: '#C26A66',
};

/** Concept A's status colours: whole cells and chips filled by band. */
export const RAG_CELL: Record<Rag, string> = {
  good: 'bg-[#E3F5EA] text-[#17703D]',
  watch: 'bg-[#FFF3DC] text-[#9A5B00]',
  behind: 'bg-[#FDECEC] text-[#B4232A]',
  none: 'bg-[#EEF1F6] text-[#4A5872]',
};

/** Scorecard cells, Concept A style: soft grey for counts, whole-cell colour for rates. */
export const CELL = 'rounded-md px-2 py-1.5 text-center font-semibold tabular';
export const NUM_CELL = `${CELL} bg-[#F6F7F9]`;
export const TOTAL_CELL = 'border-t-2 border-[#204F3F] px-2 py-2 text-center font-extrabold tabular';

/** Icon-chip colours and the matching line colour, by tone. */
export type Tone = 'zdc' | 'uic' | 'red' | 'green' | 'amber' | 'navy';
export const TONE: Record<Tone, { chip: string; color: string }> = {
  zdc: { chip: 'bg-[#E8EEF9] text-[#597DC2]', color: PALETTE.zdc },
  uic: { chip: 'bg-[#E4F1E8] text-[#38765B]', color: PALETTE.uic },
  red: { chip: 'bg-[#FEE4E2] text-[#D92D20]', color: PALETTE.red },
  green: { chip: 'bg-[#DCFAE6] text-[#079455]', color: PALETTE.green },
  amber: { chip: 'bg-[#FEF0C7] text-[#DC6803]', color: PALETTE.amber },
  navy: { chip: 'bg-[#E4E7EC] text-[#204F3F]', color: PALETTE.navy },
};
