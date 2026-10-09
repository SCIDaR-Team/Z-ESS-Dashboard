import { useState, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock,
  Database,
  FileText,
  Info,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { fmtDateTime } from '@/lib/format';
import {
  currentMonth,
  dateLabel,
  isRange,
  monthLabel,
  monthsBetween,
  periodPresets,
  periodRangeLabel,
  rangeKey,
  reportingMonthLabel,
  resolvePeriod,
  type PeriodKey,
} from '@/data/period';
import { useUiStore } from '@/store/uiStore';
import type { DatasetMeta } from '@/data/types';
import type { Option } from './filters';

export interface PageInfo {
  title: string;
  subtitle: string;
  source: string;
}

/**
 * Page frame: a navy filter panel running the full height on the left (it
 * collapses to a narrow rail), and beside it a light header with the page
 * name, page links, the period and the report's key facts.
 */
export function Shell({
  page,
  meta,
  filters,
  period,
  activeFilters,
  onResetFilters,
  children,
}: {
  page: PageInfo;
  meta: DatasetMeta;
  filters: ReactNode;
  period: ReactNode;
  activeFilters: number;
  onResetFilters: () => void;
  children: ReactNode;
}) {
  const collapsed = useUiStore((s) => s.filtersCollapsed);
  const toggle = useUiStore((s) => s.toggleFilters);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const nav = [
    { to: '/line-list', label: 'Line list' },
    { to: '/supervisory', label: 'Supervisory checklist' },
  ];
  const facts: [typeof CalendarDays, string, string][] = [
    [CalendarDays, 'Reporting period', reportingMonthLabel(meta)],
    [Clock, 'Data cut-off', dateLabel(meta.asOf)],
    [Database, 'Last refresh', fmtDateTime(meta.lastRefresh)],
    [FileText, 'Source', page.source],
  ];
  const count = (dark: boolean) =>
    activeFilters > 0 && (
      <span
        className={cn(
          'grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[10.5px] font-bold',
          dark ? 'bg-[#3D5AFE] text-white' : 'bg-[#0F1B2D] text-white'
        )}
      >
        {activeFilters}
      </span>
    );

  const panel = (
    <>
      <div className="flex items-center gap-2.5 px-5 pb-5 pt-6">
        <Link to="/" title="Home" className="flex min-w-0 items-center gap-2.5 rounded-xl">
          <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl bg-[#3D5AFE] text-[15px] font-extrabold text-white">Z</span>
          <span className="min-w-0 leading-tight">
            <span className="block text-[16px] font-extrabold text-white">Z-ESS</span>
            <span className="block text-[11.5px] text-[#8A97B1]">Zero-dose tracker</span>
          </span>
        </Link>
        <button type="button" onClick={() => setMobileOpen(false)} aria-label="Close filters" className="ml-auto rounded-lg p-1.5 text-[#8A97B1] hover:text-white lg:hidden">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex items-center gap-2 px-5 pb-3 text-[#8A97B1]">
        <SlidersHorizontal className="h-4 w-4" aria-hidden />
        <span className="text-[11px] font-bold uppercase tracking-[0.08em]">Filters</span>
        {count(true)}
      </div>
      <div className="flex flex-col gap-4 px-5">{filters}</div>
      <div className="px-5 pt-5">
        <button
          type="button"
          onClick={onResetFilters}
          disabled={activeFilters === 0}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#26365A] py-2 text-[13px] font-semibold text-[#C9D2E3] enabled:hover:border-[#3D5AFE] enabled:hover:text-white disabled:opacity-40"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Reset filters
        </button>
      </div>
      <div className="mt-auto hidden border-t border-white/10 px-3 py-3 lg:block">
        <button
          type="button"
          onClick={toggle}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-[13px] font-semibold text-[#8A97B1] hover:bg-white/5 hover:text-white"
        >
          <PanelLeftClose className="h-[18px] w-[18px]" aria-hidden /> Collapse panel
        </button>
      </div>
    </>
  );

  const rail = (
    <div className="flex h-full flex-col items-center gap-4 py-6">
      <Link to="/" title="Home" aria-label="Home" className="grid h-9 w-9 place-items-center rounded-xl bg-[#3D5AFE] text-[15px] font-extrabold text-white">
        Z
      </Link>
      <button type="button" onClick={toggle} title="Show filters" className="mt-2 flex flex-col items-center gap-2 rounded-xl px-2 py-3 text-[#8A97B1] hover:bg-white/5 hover:text-white">
        <SlidersHorizontal className="h-[18px] w-[18px]" aria-hidden />
        {count(true)}
        <span className="text-[11.5px] font-semibold [writing-mode:vertical-rl]">Filters</span>
      </button>
      <button type="button" onClick={toggle} aria-label="Expand panel" title="Expand panel" className="mt-auto rounded-lg p-2 text-[#8A97B1] hover:bg-white/5 hover:text-white">
        <PanelLeftOpen className="h-[18px] w-[18px]" />
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F3F5F9] text-[#101828] lg:flex">
      {/* Desktop: full-height panel. Phones: a drawer over the page. */}
      <aside
        aria-label="Filters"
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-[280px] flex-col overflow-y-auto bg-[#0F1B2D] transition-transform lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:flex-shrink-0 lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          collapsed ? 'lg:w-[72px]' : 'lg:w-[272px]'
        )}
      >
        <div className={cn('flex min-h-full flex-col', collapsed && 'lg:hidden')}>{panel}</div>
        {collapsed && <div className="hidden h-full lg:block">{rail}</div>}
      </aside>
      {mobileOpen && <button type="button" aria-label="Close filters" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-30 bg-[#0F1B2D]/40 lg:hidden" />}

      <div className="min-w-0 flex-1">
        {/* One row: title, the key facts (fewer as space runs out — all of them under the info button), page links, period. */}
        <header className="sticky top-0 z-20 border-b border-[#EAECF0] bg-white/95 backdrop-blur">
          <div className="flex min-h-[68px] flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 sm:px-6 lg:flex-nowrap lg:px-8">
            <h1 title={page.subtitle} className="whitespace-nowrap text-[19px] font-bold tracking-[-0.01em] text-[#101828]">
              {page.title}
            </h1>
            <dl className="hidden min-w-0 items-center gap-x-4 xl:flex">
              {facts.map(([Icon, k, v], i) => (
                <div
                  key={k}
                  className={cn('flex items-center gap-1.5 whitespace-nowrap text-[12.5px]', i === 1 && 'hidden 2xl:flex', i >= 2 && 'hidden min-[1800px]:flex')}
                >
                  <Icon className="h-3.5 w-3.5 text-[#98A2B3]" aria-hidden />
                  <dt className="text-[#667085]">{k}</dt>
                  <dd className="font-semibold text-[#101828]">{v}</dd>
                </div>
              ))}
              {meta.source === 'mock' && (
                <span className="hidden whitespace-nowrap rounded-full bg-[#FFFAEB] px-2 py-0.5 text-[11.5px] font-semibold text-[#B54708] ring-1 ring-inset ring-[#FEDF89] min-[1800px]:inline">
                  Demo data
                </span>
              )}
            </dl>
            <div className="ml-auto flex flex-wrap items-center gap-2 lg:flex-nowrap">
              <nav className="inline-flex rounded-full bg-[#F2F4F7] p-1" aria-label="Dashboards">
                {nav.map((n) => (
                  <NavLink
                    key={n.to}
                    to={n.to}
                    className={({ isActive }) =>
                      cn(
                        'whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-semibold',
                        isActive ? 'bg-white text-[#101828] shadow-sm' : 'text-[#667085] hover:text-[#101828]'
                      )
                    }
                  >
                    {n.label}
                  </NavLink>
                ))}
              </nav>
              {period}
              <div className="relative min-[1800px]:hidden">
                <button
                  type="button"
                  onClick={() => setInfoOpen((o) => !o)}
                  aria-expanded={infoOpen}
                  aria-label="Report details"
                  title="Report details"
                  className="grid h-9 w-9 place-items-center rounded-full border border-[#EAECF0] text-[#475467] hover:border-[#D0D5DD] hover:text-[#101828]"
                >
                  <Info className="h-4 w-4" />
                </button>
                {infoOpen && (
                  <>
                    <button type="button" aria-label="Close report details" onClick={() => setInfoOpen(false)} className="fixed inset-0 z-10 cursor-default" />
                    <dl className="absolute right-0 top-11 z-20 w-[290px] rounded-2xl bg-white p-4 shadow-[0_12px_32px_-8px_rgba(16,24,40,0.25)] ring-1 ring-[#EAECF0]">
                      {facts.map(([Icon, k, v]) => (
                        <div key={k} className="flex items-start gap-2 py-1.5 text-[13px]">
                          <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#98A2B3]" aria-hidden />
                          <dt className="w-[108px] flex-shrink-0 text-[#667085]">{k}</dt>
                          <dd className="font-semibold text-[#101828]">{v}</dd>
                        </div>
                      ))}
                      {meta.source === 'mock' && (
                        <p className="mt-2 rounded-lg bg-[#FFFAEB] px-2.5 py-1.5 text-[12px] font-semibold text-[#B54708]">Demo data — not real programme figures</p>
                      )}
                    </dl>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#EAECF0] px-3 py-1.5 text-[13px] font-semibold text-[#344054] lg:hidden"
              >
                <SlidersHorizontal className="h-4 w-4" aria-hidden /> Filters {count(false)}
              </button>
            </div>
          </div>
        </header>
        <main className="px-4 pb-14 pt-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
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
      <span className="mb-1.5 block text-[12px] font-semibold text-[#C9D2E3]">{label}</span>
      <span className="relative block">
        <select
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-full appearance-none truncate rounded-xl border border-[#26365A] bg-[#16243B] pl-3 pr-8 text-[13.5px] text-white outline-none hover:border-[#33466E] focus:border-[#3D5AFE] disabled:cursor-not-allowed"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value} className="text-black">
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-3 h-4 w-4 text-[#8A97B1]" aria-hidden />
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
      <span className="text-[11.5px] text-[#8A97B1]">{periodRangeLabel(resolved)}</span>
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
