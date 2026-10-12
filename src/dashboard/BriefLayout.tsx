import type { LucideIcon } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import type { PathwayCounts } from '@/data/calc/lineList';
import { pathwayRates } from '@/data/calc/lineList';
import type { Progress } from '@/data/calc/targets';
import { fmtInt, fmtPct } from '@/lib/format';

export const BRIEF_BLUE = '#4C9DE5';
export const BRIEF_GREEN = '#55B982';

export function ChartViewSelect<T extends string>({ label, value, onChange, options }: {
  label: string; value: T; onChange: (value: T) => void; options: { value: T; label: string }[];
}) {
  return <label className="chart-view-control">
    <SlidersHorizontal size={16} aria-hidden />
    <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value as T)}>
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
    <ChevronDown size={15} aria-hidden />
  </label>;
}

export function BriefKpi({ label, value, icon: Icon, color = BRIEF_BLUE, note }: {
  label: string; value: string; icon: LucideIcon; color?: string; note?: string;
}) {
  return <div className="brief-kpi" style={{ '--metric-color': color } as CSSProperties}>
    <span className="brief-kpi-icon"><Icon size={19} aria-hidden /></span>
    <div><p>{label}</p><strong className="tabular">{value}</strong>{note && <small>{note}</small>}</div>
  </div>;
}

export function BriefPanel({ title, children, action, className = '' }: {
  title: string; children: ReactNode; action?: ReactNode; className?: string;
}) {
  return <section className={`brief-panel ${className}`}><div className="brief-panel-heading"><h3>{title}</h3>{action}</div>{children}</section>;
}

export interface BriefSeries { label: string; color: string; }
export interface BriefBarRow { key: string; label: string; values: (number | null)[]; flagged?: boolean; }

export function BriefBars({ rows, series, rate = false, onPick, label }: {
  rows: BriefBarRow[]; series: BriefSeries[]; rate?: boolean; onPick?: (key: string) => void; label: string;
}) {
  const max = rate ? Math.max(100, ...rows.flatMap((r) => r.values.map((v) => v ?? 0)))
    : Math.max(1, ...rows.flatMap((r) => r.values.map((v) => v ?? 0)));
  return <div className="brief-bar-chart" role="group" aria-label={label}>
    <div className="brief-chart-legend">{series.map((s) => <span key={s.label}><i style={{ background: s.color }} />{s.label}</span>)}</div>
    <ul>{rows.map((r) => <li key={r.key}>
      <button type="button" disabled={!onPick} onClick={() => onPick?.(r.key)} className="brief-bar-row" title={r.label}>
        <span className="brief-bar-label">{r.label}</span>
        <span className="brief-bar-series">{r.values.map((v, i) => <span className="brief-bar-value" key={series[i].label} aria-label={`${series[i].label}: ${rate ? fmtPct(v) : fmtInt(v)}`}>
          <span className="brief-bar-track"><span style={{ width: `${(v ?? 0) / max * 100}%`, background: series[i].color }} /></span>
          <span className={r.flagged ? 'text-[#B4232A]' : ''}>{rate ? fmtPct(v, 1) : fmtInt(v)}</span>
        </span>)}</span>
      </button>
    </li>)}</ul>
    <div className="brief-chart-axis"><span>0{rate && '%'}</span><span>{rate ? fmtPct(max / 2, 0) : fmtInt(Math.round(max / 2))}</span><span>{rate ? fmtPct(max, 0) : fmtInt(max)}</span></div>
  </div>;
}

export function BriefPathway({ label, counts, color }: { label: string; counts: PathwayCounts; color: string; }) {
  const rates = pathwayRates(counts);
  return <BriefPanel title={`${label} pathway`} className="brief-pathway-panel">
    <div className="brief-funnel" aria-label={`${label} child pathway`}>
      {([['Identified', counts.identified], ['Referred', counts.referred], ['Vaccinated', counts.vaccinated]] as const).map(([step, value], i) =>
        <div key={step} className="brief-funnel-step" style={{ background: `color-mix(in srgb, ${color} ${100 - i * 20}%, white)`, color: '#173C32', clipPath: `polygon(${i * 9}% 0, ${100 - i * 9}% 0, ${91 - i * 9}% 100%, ${9 + i * 9}% 100%)` }}>
          <strong>{fmtInt(value)}</strong><span>{step}</span>
        </div>)}
    </div>
    <div className="brief-pathway-rate"><span>Conversion rate</span><strong style={{ color: `color-mix(in srgb, ${color} 60%, var(--metric-foreground))` }}>{fmtPct(rates.conversion)}</strong></div>
    <div className="brief-referral-outcome"><span>Vaccinated after referral</span><b>{fmtInt(counts.vaccinatedAfterReferral)}</b><span>Referral completion</span><b>{fmtPct(rates.referralCompletion)}</b></div>
  </BriefPanel>;
}

export function BriefTarget({ label, progress, color }: { label: string; progress: Progress; color: string; }) {
  const circumference = 2 * Math.PI * 46;
  const arc = Math.min(100, Math.max(0, progress.achievement ?? 0)) / 100;
  return <div className="brief-target">
    <h4>{label}</h4>
    <div className="brief-target-ring" role="img" aria-label={`${label}: ${fmtPct(progress.achievement)} achievement`}>
      <svg viewBox="0 0 112 112" aria-hidden><circle cx="56" cy="56" r="46" fill="none" stroke={color} strokeOpacity=".15" strokeWidth="12" /><circle cx="56" cy="56" r="46" fill="none" stroke={color} strokeWidth="12" strokeDasharray={`${arc * circumference} ${circumference}`} transform="rotate(-90 56 56)" /></svg>
      <div><strong>{fmtPct(progress.achievement)}</strong><span>Achievement</span></div>
    </div>
    <dl><div><dt>Target</dt><dd>{fmtInt(progress.target)}</dd></div><div><dt>Achieved</dt><dd style={{ color: `color-mix(in srgb, ${color} 60%, var(--metric-foreground))` }}>{fmtInt(progress.achieved)}</dd></div></dl>
    <p>{fmtInt(progress.remaining)} remaining</p>
  </div>;
}

export function BriefRateCell({ value, color }: { value: number | null; color: string }) {
  return <span className="brief-table-rate"><span><i style={{ width: `${Math.min(100, Math.max(0, value ?? 0))}%`, background: color }} /></span><b>{fmtPct(value)}</b></span>;
}
