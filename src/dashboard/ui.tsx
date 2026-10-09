import { useEffect, useState, type ReactNode } from 'react';
import { AlertTriangle, CalendarDays, CheckCircle2, ChevronDown, ChevronRight, Clock, Database, FileText, Info, Menu, PanelLeftClose, PanelLeftOpen, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/cn';
import { fmtDateTime } from '@/lib/format';
import { currentMonth, dateLabel, isRange, monthLabel, monthsBetween, periodPresets, periodRangeLabel, rangeKey, reportingMonthLabel, resolvePeriod, type PeriodKey } from '@/data/period';
import { useUiStore } from '@/store/uiStore';
import type { DatasetMeta } from '@/data/types';
import type { Option } from './filters';
import { WorkspaceNav } from './WorkspaceNav';

export interface PageInfo { title: string; subtitle: string; source: string; }

export function Shell({ page, meta, filters, period, activeFilters, onResetFilters, children }: {
  page: PageInfo; meta: DatasetMeta; filters: ReactNode; period: ReactNode;
  activeFilters: number; onResetFilters: () => void; children: ReactNode;
}) {
  const collapsed = useUiStore((s) => s.filtersCollapsed);
  const toggle = useUiStore((s) => s.toggleFilters);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') { setMobileOpen(false); setInfoOpen(false); } };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);
  const facts: [typeof CalendarDays, string, string][] = [
    [CalendarDays, 'Reporting period', reportingMonthLabel(meta)],
    [Clock, 'Data cut-off', dateLabel(meta.asOf)],
    [Database, 'Last refresh', fmtDateTime(meta.lastRefresh)],
    [FileText, 'Source', page.source],
  ];
  return <div className={cn('workspace report-workspace', collapsed && 'sidebar-collapsed')}>
    <a href="#report-content" className="skip-link">Skip to content</a>
    <aside aria-label="Workspace and filters" className={cn('workspace-sidebar report-sidebar', mobileOpen && 'mobile-open')}>
      <div className={cn('expanded-sidebar-content', collapsed && 'desktop-hidden')}><WorkspaceNav onClose={() => setMobileOpen(false)}>
        <div className="report-filter-section"><div className="filter-section-heading"><SlidersHorizontal size={15} /><span>REFINE YOUR VIEW</span>{activeFilters > 0 && <b>{activeFilters}</b>}</div><div className="report-filter-controls">{filters}</div><button type="button" className="reset-filter-button" onClick={onResetFilters} disabled={activeFilters === 0}><RotateCcw size={14} />Reset filters</button></div>
      </WorkspaceNav></div>
      {collapsed && <div className="collapsed-sidebar-content"><WorkspaceNav compact /><button type="button" className="expand-sidebar-button" onClick={toggle} aria-label="Expand filters"><PanelLeftOpen size={19} /></button></div>}
      <button type="button" className="collapse-sidebar-button" onClick={toggle}>{collapsed ? <PanelLeftOpen size={17} /> : <><PanelLeftClose size={17} />Collapse sidebar</>}</button>
    </aside>
    {mobileOpen && <button type="button" className="nav-backdrop" aria-label="Close navigation and filters" onClick={() => setMobileOpen(false)} />}
    <div className="workspace-body"><header className="workspace-topbar report-topbar"><div className="topbar-breadcrumb"><button type="button" className="mobile-menu-button" aria-label="Open navigation and filters" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}><Menu size={20} /></button><span>Workspace</span><ChevronRight size={14} /><strong>{page.title}</strong></div><div className="topbar-meta">{meta.source === 'mock' && <span className="demo-badge"><i />Demo workspace</span>}<div className="report-info-control"><button type="button" className="icon-link" aria-label="Report details" aria-expanded={infoOpen} onClick={() => setInfoOpen((o) => !o)}><Info size={18} /></button>{infoOpen && <><button type="button" className="info-dismiss" aria-label="Close report details" onClick={() => setInfoOpen(false)} /><dl className="report-info-popover">{facts.map(([Icon, k, v]) => <div key={k}><Icon size={15} /><dt>{k}</dt><dd>{v}</dd></div>)}{meta.source === 'mock' && <p>Demo data — not real programme figures</p>}</dl></>}</div><span className="workspace-avatar">Z</span></div></header>
      <main id="report-content" className="report-content"><div className="report-page-heading"><div><p className="eyebrow">PROGRAMME INTELLIGENCE</p><h1>{page.title}<span>.</span></h1><p>{page.subtitle}</p></div><div className="report-heading-actions">{period}<button type="button" className="mobile-filter-button" onClick={() => setMobileOpen(true)}><SlidersHorizontal size={15} />Filters {activeFilters > 0 && `(${activeFilters})`}</button></div></div>{children}</main>
    </div>
  </div>;
}

/** Filter control for the navy panel. */
export function FilterSelect({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className={cn('block', disabled && 'opacity-40')}>
      <span className="mb-1.5 block text-[12px] font-semibold text-[#56685F]">{label}</span>
      <span className="relative block">
        <select
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-full appearance-none truncate rounded-xl border border-[#E1E7E2] bg-white pl-3 pr-8 text-[13.5px] text-[#213A30] outline-none hover:border-[#A0B7AA] focus:border-[#23765D] disabled:cursor-not-allowed"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value} className="text-black">
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-3 h-4 w-4 text-[#7C8981]" aria-hidden />
      </span>
    </label>
  );
}

const CUSTOM = 'custom';

/** Period filter for the panel: quick picks, or a custom from–to range of months. */
export function PeriodFilter({ value, onChange, meta }: { value: PeriodKey; onChange: (k: PeriodKey) => void; meta: DatasetMeta }) {
  const resolved = resolvePeriod(value, meta);
  const custom = isRange(value);
  const months = monthsBetween(meta.firstMonth, currentMonth(meta)).map((m) => ({ value: m, label: monthLabel(m, true) }));
  const from = resolved.months[0];
  const to = resolved.months[resolved.months.length - 1];
  return (
    <div className="flex flex-col gap-2">
      <FilterSelect
        label="Period"
        value={custom ? CUSTOM : value}
        options={[...periodPresets(meta).map((p) => ({ value: p.key, label: p.label })), { value: CUSTOM, label: 'Custom range…' }]}
        onChange={(v) => onChange(v === CUSTOM ? rangeKey(from, to) : (v as PeriodKey))}
      />
      {custom && (
        <div className="grid grid-cols-2 gap-2">
          <FilterSelect label="From" value={from} options={months} onChange={(v) => onChange(rangeKey(v, v > to ? v : to))} />
          <FilterSelect label="To" value={to} options={months} onChange={(v) => onChange(rangeKey(v < from ? v : from, v))} />
        </div>
      )}
      <span className="text-[11.5px] text-[#7C8981]">{periodRangeLabel(resolved)}</span>
    </div>
  );
}

/** The period as a chip in the header, with the quick picks; synced with the panel filter. */
export function PeriodChip({ value, onChange, meta }: { value: PeriodKey; onChange: (k: PeriodKey) => void; meta: DatasetMeta }) {
  const resolved = resolvePeriod(value, meta);
  const presets = periodPresets(meta);
  const custom = isRange(value);
  return (
    <label className="relative inline-flex items-center gap-2 rounded-full border border-[#EAECF0] bg-white py-1.5 pl-3 pr-8 text-[13px] hover:border-[#D0D5DD]">
      <CalendarDays className="h-4 w-4 text-[#667085]" aria-hidden />
      <span className="whitespace-nowrap font-semibold text-[#101828]">{periodRangeLabel(resolved)}</span>
      <span className="hidden whitespace-nowrap text-[#667085] 2xl:inline">· {custom ? 'Custom range' : resolved.label}</span>
      <ChevronDown className="pointer-events-none absolute right-2.5 h-4 w-4 text-[#667085]" aria-hidden />
      <select
        aria-label="Period"
        value={custom ? CUSTOM : value}
        onChange={(e) => e.target.value !== CUSTOM && onChange(e.target.value as PeriodKey)}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {presets.map((p) => (
          <option key={p.key} value={p.key}>
            {p.label}
          </option>
        ))}
        {custom && (
          <option value={CUSTOM} disabled>
            Custom range (set in the panel)
          </option>
        )}
      </select>
    </label>
  );
}

export function Check({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <li className="flex gap-2.5">
      {ok ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#12B76A]" aria-label="Passed" />
      ) : (
        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#F79009]" aria-label="Needs review" />
      )}
      <span>{children}</span>
    </li>
  );
}
