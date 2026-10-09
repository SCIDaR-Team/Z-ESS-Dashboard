import type { Rag } from './common';

/**
 * Dashboard palette. Navy carries the frame, blue is zero-dose (and the one
 * accent), teal is under-immunised; green/amber/red are reserved for status.
 */
export const PALETTE = {
  navy: '#0F1B2D',
  ink: '#101828',
  soft: '#475467',
  mute: '#98A2B3',
  line: '#EAECF0',
  page: '#F3F5F9',
  zdc: '#3D5AFE',
  zdcLight: '#E0E6FF',
  uic: '#00A389',
  uicLight: '#D2F2EB',
  green: '#12B76A',
  amber: '#F79009',
  red: '#F04438',
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
export const TOTAL_CELL = 'border-t-2 border-[#0F1B2D] px-2 py-2 text-center font-extrabold tabular';

/** Icon-chip colours and the matching line colour, by tone. */
export type Tone = 'zdc' | 'uic' | 'red' | 'green' | 'amber' | 'navy';
export const TONE: Record<Tone, { chip: string; color: string }> = {
  zdc: { chip: 'bg-[#E0E6FF] text-[#3D5AFE]', color: PALETTE.zdc },
  uic: { chip: 'bg-[#D2F2EB] text-[#00876F]', color: PALETTE.uic },
  red: { chip: 'bg-[#FEE4E2] text-[#D92D20]', color: PALETTE.red },
  green: { chip: 'bg-[#DCFAE6] text-[#079455]', color: PALETTE.green },
  amber: { chip: 'bg-[#FEF0C7] text-[#DC6803]', color: PALETTE.amber },
  navy: { chip: 'bg-[#E4E7EC] text-[#0F1B2D]', color: PALETTE.navy },
};
