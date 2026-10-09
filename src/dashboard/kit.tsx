import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowDownRight, ArrowRight, ArrowUpRight, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { fmtInt } from '@/lib/format';
import type { Crumb, Delta, Rag } from './common';
import { RAG_CELL, TONE, type Tone } from './theme';

export type { Tone };

export function ComparisonBar({ label, value, max, color, flagged = false }: {
  label: string;
  value: number;
  max: number;
  color: string;
  flagged?: boolean;
}) {
  return (
    <span className="flex items-center gap-2 text-[11.5px] text-[#657264]" aria-label={`${label}: ${fmtInt(value)}`}>
      <span className="h-2.5 flex-1 rounded-full bg-[#EEF1F6]">
        <span className="block h-full rounded-full" style={{ width: `${value / Math.max(1, max) * 100}%`, background: color }} />
      </span>
      <span className={cn('w-14 text-right tabular', flagged && 'text-[#B4232A]')} title={flagged ? 'Subset exceeds total doses — flagged for review' : undefined}>
        {fmtInt(value)}
      </span>
    </span>
  );
}

/** Soft white card: large radius, faint shadow, no border. */
export function Card({
  title,
  hint,
  action,
  children,
  className,
  id,
}: {
  title?: string;
  hint?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        'report-card min-w-0 rounded-xl border border-[#E4E9DF] bg-white p-5',
        className
      )}
    >
      {title && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-[15px] font-bold text-[#253E33]">{title}</h3>
            {hint && <p className="mt-0.5 text-[12.5px] text-[#667085]">{hint}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function DeltaPill({ delta, onDark }: { delta: Delta | null; onDark?: boolean }) {
  if (!delta) return null;
  const Icon = delta.dir === 'up' ? ArrowUpRight : delta.dir === 'down' ? ArrowDownRight : ArrowRight;
  const tone = onDark
    ? 'bg-white/15 text-white'
    : delta.good === null
      ? 'bg-[#F2F4F7] text-[#657264]'
      : delta.good
        ? 'bg-[#ECFDF3] text-[#067647]'
        : 'bg-[#FEF3F2] text-[#B42318]';
  return (
    <span className={cn('inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11.5px] font-semibold tabular', tone)}>
      <Icon className="h-3 w-3" aria-hidden />
      {delta.text}
    </span>
  );
}

/**
 * Tiny line of monthly values, complete months only: a month still in
 * progress would always look like a drop. Scaled to the values' own range so
 * the shape is visible.
 */
export function Sparkline({ values, partialLast, color, className }: { values: (number | null)[]; partialLast?: boolean; color: string; className?: string }) {
  const w = 96;
  const h = 32;
  const nums = (partialLast ? values.slice(0, -1) : values).map((v) => v ?? 0);
  if (nums.length < 2) return <span className={cn('h-8 w-24', className)} />;
  const max = Math.max(...nums);
  const min = Math.min(...nums);
  const pad = (max - min || Math.max(1, max)) * 0.25;
  const lo = min - pad;
  const hi = max + pad;
  const x = (i: number) => 3 + (i / (nums.length - 1)) * (w - 6);
  const y = (v: number) => h - 3 - ((v - lo) / (hi - lo)) * (h - 6);
  const line = nums.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `${line} L${x(nums.length - 1)},${h} L${x(0)},${h} Z`;
  const li = nums.length - 1;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={cn('h-8 w-24 flex-shrink-0', className)} aria-hidden>
      <path d={area} fill={color} opacity={0.12} />
      <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(li)} cy={y(nums[li])} r={3} fill={color} />
    </svg>
  );
}


/**
 * Headline figure: icon chip and label, a large number, the change against
 * the previous period and a sparkline of the monthly values. `featured` fills
 * the card so the eye lands on it first.
 */
export function KpiCard({
  label,
  value,
  sub,
  details,
  icon: Icon,
  tone,
  delta,
  compareLabel,
  spark,
  featured,
  fallback,
}: {
  label: string;
  value: string;
  sub?: ReactNode;
  details?: ReactNode;
  icon: LucideIcon;
  tone: Tone;
  delta: Delta | null;
  compareLabel: string | null;
  spark: { values: (number | null)[]; partialLast: boolean };
  featured?: boolean;
  /** Shown instead of the change pill when there is no earlier period. */
  fallback?: string;
}) {
  return (
    <div
      className={cn(
        'report-kpi flex min-w-0 flex-col rounded-xl border border-[#E4E9DF] p-5',
        featured
          ? 'featured-kpi bg-[#204F3F] text-white'
          : 'bg-white text-[#253E33]'
      )}
    >
      <div className="flex items-center gap-2.5">
        <span className={cn('grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg', featured ? 'bg-white/10 text-white' : TONE[tone].chip)}>
          <Icon className="h-[18px] w-[18px]" aria-hidden />
        </span>
        <p className={cn('text-[13.5px] font-semibold', featured ? 'text-white/80' : 'text-[#657264]')}>{label}</p>
      </div>
      <div className="mt-4 flex items-end justify-between gap-2">
        <p className="text-[34px] font-semibold leading-none tracking-[-0.02em] tabular">{value}</p>
        <Sparkline values={spark.values} partialLast={spark.partialLast} color={featured ? '#C5DFA1' : TONE[tone].color} />
      </div>
      <div className={cn('mt-3 flex flex-wrap items-center gap-1.5 text-[12px]', featured ? 'text-white/60' : 'text-[#667085]')}>
        {delta ? (
          <>
            <DeltaPill delta={delta} onDark={featured} />
            <span>vs {compareLabel}</span>
          </>
        ) : (
          <span>{compareLabel ? `No data for ${compareLabel}` : (fallback ?? 'No earlier period to compare')}</span>
        )}
      </div>
      {sub && <p className={cn('mt-1.5 text-[12px]', featured ? 'text-white/60' : 'text-[#667085]')}>{sub}</p>}
      {details}
    </div>
  );
}

export function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-full bg-[#F2F4F7] p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-full px-3 py-1 text-[12px] font-semibold',
            o.value === value ? 'bg-white text-[#253E33] shadow-sm' : 'text-[#667085] hover:text-[#253E33]'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Crumbs({ items, onPick }: { items: Crumb[]; onPick: (c: Crumb) => void }) {
  return (
    <nav aria-label="Area" className="flex flex-wrap items-center gap-1 text-[12.5px] text-[#667085]">
      {items.map((c, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-[#93A28C]" aria-hidden />}
          {c.patch ? (
            <button type="button" onClick={() => onPick(c)} className="rounded px-1 font-semibold text-[#597DC2] hover:bg-[#EEF1FF]">
              {c.label}
            </button>
          ) : (
            <span className="px-1 font-semibold text-[#253E33]">{c.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

/** Concept A's status chip: filled by band. */
export function Chip({ rag, children }: { rag: Rag; children: ReactNode }) {
  return <span className={cn('whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-bold', RAG_CELL[rag])}>{children}</span>;
}

export function RagLegend({ note }: { note?: ReactNode }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 text-[11.5px] text-[#667085]">
      {(
        [
          ['bg-[#E3F5EA]', 'On track (≥ 75%)'],
          ['bg-[#FFF3DC]', 'Watch (60–75%)'],
          ['bg-[#FDECEC]', 'Behind (< 60%)'],
        ] as const
      ).map(([c, l]) => (
        <span key={l} className="flex items-center gap-1">
          <i className={cn('inline-block h-2.5 w-3.5 rounded-sm', c)} /> {l}
        </span>
      ))}
      {note && <span>{note}</span>}
    </div>
  );
}
