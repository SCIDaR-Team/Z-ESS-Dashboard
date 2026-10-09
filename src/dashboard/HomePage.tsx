import { useMemo, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  CalendarDays,
  Check,
  ClipboardCheck,
  Clock,
  Database,
  ListChecks,
  MapPinned,
  Target,
  TrendingDown,
  TrendingUp,
  Waypoints,
} from 'lucide-react';
import type { Dataset } from '@/data/normalise';
import { completeMonths, currentMonth, dateLabel, monthLabel, prevMonth, rangeKey, resolvePeriod, type PeriodKey } from '@/data/period';
import { pathwayRates, summariseLineList, waitingSplit, type LineListRow } from '@/data/calc/lineList';
import type { Scope } from '@/data/calc/scope';
import { summariseSupervisory } from '@/data/calc/supervisory';
import { summariseTargets } from '@/data/calc/targets';
import { pct } from '@/data/calc/rates';
import { getState, STATES } from '@/data/reference/geography';
import { fmtDateTime, fmtInt, fmtPct } from '@/lib/format';
import { cn } from '@/lib/cn';
import { useFilterStore } from '@/store/filterStore';
import { delta, rag, waiting } from './common';
import { Chip, DeltaPill } from './kit';
import { PALETTE, TONE, type Tone } from './theme';

const ALL: Scope = { stateId: null, lgaId: null, wardId: null, settlementId: null };
/** Share of the monthly target that counts as on track (the supervisory page's green band). */
const ON_TRACK = 90;

const found = (t: LineListRow) => t.zdc.identified + t.uic.identified;
const vaccinated = (t: LineListRow) => t.zdc.vaccinated + t.uic.vaccinated;

/** Everything the landing page says, read from the same calculations as the dashboards. */
function useHomeFacts(ds: Dataset) {
  return useMemo(() => {
    const meta = ds.meta;
    const toDate = resolvePeriod('to-date', meta);
    const L = summariseLineList(ds, ALL, toDate);
    const split = waitingSplit(ds, ALL, toDate);
    const states = STATES.filter((s) => L.rows.some((r) => r.stateId === s.id && found(r) > 0)).map((s) => s.name);

    const byWait = [...L.rows].filter((r) => waiting(r) > 0).sort((a, b) => waiting(b) - waiting(a));

    // Targets are full-month and not prorated, so they are judged on the last complete month.
    const complete = completeMonths(meta);
    const last = complete[complete.length - 1] ?? null;
    const before = complete[complete.length - 2] ?? null;
    const lastKey: PeriodKey | null = last ? (last === prevMonth(currentMonth(meta)) ? 'last-month' : rangeKey(last, last)) : null;
    const tgt = last ? summariseTargets(ds, ALL, resolvePeriod(`month:${last}`, meta)) : null;
    const targeted = tgt ? tgt.rows.filter((r) => r.zdc.target !== null) : [];

    const foundIn = (m: string) => found(summariseLineList(ds, ALL, resolvePeriod(`month:${m}`, meta)).total);
    const thisMonth = resolvePeriod('this-month', meta);

    return {
      meta,
      toDate,
      T: L.total,
      split,
      states,
      lgasReached: L.rows.filter((r) => found(r) > 0).length,
      byWait,
      last,
      before,
      lastKey,
      tgt,
      targeted,
      onTrack: targeted.filter((r) => (r.zdc.achievement ?? 0) >= ON_TRACK).length,
      lowest: [...targeted].sort((a, b) => (a.zdc.achievement ?? 0) - (b.zdc.achievement ?? 0))[0] ?? null,
      foundLast: last ? foundIn(last) : null,
      foundBefore: before ? foundIn(before) : null,
      thisMonth,
      foundThisMonth: thisMonth.partial ? found(summariseLineList(ds, ALL, thisMonth).total) : null,
      reportsThisMonth: summariseSupervisory(ds, ALL, thisMonth).total.reports,
    };
  }, [ds]);
}

/**
 * Landing page: what the programme is, where every child stands, the few
 * things the data says most loudly right now, and the way into each dashboard.
 */
export function HomePage({ ds }: { ds: Dataset }) {
  const h = useHomeFacts(ds);
  const navigate = useNavigate();
  const setLineList = useFilterStore((s) => s.setLineList);
  const setSupervisory = useFilterStore((s) => s.setSupervisory);
  const { T, split, meta } = h;

  const total = found(T);
  const vacc = vaccinated(T);
  const wait = split.referred + split.notReferred;
  const since = monthLabel(meta.firstMonth);

  const openLineList = (patch: { stateId?: string | null; lgaId?: string | null; period?: PeriodKey | null } = {}) => {
    setLineList({ stateId: null, lgaId: null, wardId: null, settlementId: null, period: null, ...patch });
    navigate('/line-list');
  };
  const openSupervisory = (period: PeriodKey | null) => {
    setSupervisory({ stateId: null, lgaId: null, period });
    navigate('/supervisory');
  };

  // 1 · Where children get stuck
  const stuckAfterReferral = split.referred >= split.notReferred;
  const stuck = stuckAfterReferral ? split.referred : split.notReferred;
  const z = pathwayRates(T.zdc);
  const u = pathwayRates(T.uic);

  // 2 · Where to act first
  const [top, ...next] = h.byWait;
  const place = (r: { label: string; stateId: string }) => (h.states.length > 1 ? `${r.label} (${getState(r.stateId)?.name})` : r.label);

  // 4 · Month on month
  const change = h.foundLast !== null ? delta(h.foundLast, h.foundBefore, 'count') : null;

  return (
    <div className="min-h-screen bg-[#F3F5F9] text-[#101828]">
      <header className="bg-[#0F1B2D] text-white">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 py-5">
            <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl bg-[#3D5AFE] text-[15px] font-extrabold">Z</span>
            <div className="leading-tight">
              <p className="text-[16px] font-extrabold">Z-ESS</p>
              <p className="text-[11.5px] text-[#8A97B1]">Zero-dose tracker</p>
            </div>
            <nav aria-label="Dashboards" className="ml-auto hidden items-center gap-1 sm:flex">
              <Link to="/line-list" className="rounded-full px-3.5 py-1.5 text-[13px] font-semibold text-[#C9D2E3] hover:bg-white/5 hover:text-white">
                Line list
              </Link>
              <Link to="/supervisory" className="rounded-full px-3.5 py-1.5 text-[13px] font-semibold text-[#C9D2E3] hover:bg-white/5 hover:text-white">
                Supervisory checklist
              </Link>
            </nav>
          </div>

          <div className="grid gap-10 pb-14 pt-6 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-14 lg:pb-20 lg:pt-10">
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#8A97B1]">
                Zero-dose and under-immunised children{h.states.length > 0 && ` · ${h.states.join(' and ')}`}
              </p>
              <h1 className="mt-3 text-[34px] font-extrabold leading-[1.08] tracking-[-0.025em] sm:text-[46px]">
                Every missed child, found and followed until vaccinated.
              </h1>
              <p className="mt-5 max-w-[560px] text-[16px] leading-relaxed text-[#C9D2E3]">
                Since {since}, field teams have found <b className="font-bold text-white">{fmtInt(total)}</b> children aged 12–23 months who missed
                their Penta doses, across <b className="font-bold text-white">{fmtInt(T.settlements)}</b> settlements in {h.lgasReached} LGAs.{' '}
                <b className="font-bold text-white">{fmtInt(vacc)}</b> are now vaccinated; <b className="font-bold text-white">{fmtInt(wait)}</b> are
                still waiting.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  to="/line-list"
                  className="inline-flex items-center gap-2 rounded-full bg-[#3D5AFE] px-5 py-2.5 text-[14px] font-semibold text-white hover:bg-[#3349E0]"
                >
                  Open the line list <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <Link
                  to="/supervisory"
                  className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[14px] font-semibold text-white ring-1 ring-inset ring-white/25 hover:bg-white/5"
                >
                  Supervisory checklist
                </Link>
              </div>
            </div>

            <StandPanel
              total={total}
              vaccinated={vacc}
              referred={split.referred}
              notReferred={split.notReferred}
              asOf={dateLabel(h.toDate.cutoff)}
              zdc={{ found: T.zdc.identified, conversion: z.conversion }}
              uic={{ found: T.uic.identified, conversion: u.conversion }}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1240px] px-4 pb-16 pt-12 sm:px-6 lg:px-8">
        <SectionHead title="What the data is saying" hint={`Read from the latest data, cut off ${dateLabel(meta.asOf)}. Each one opens the view behind it.`} />
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Insight
            icon={Waypoints}
            tone="red"
            kicker="Where children get stuck"
            title={
              stuckAfterReferral
                ? `${fmtInt(stuck)} referred children are not vaccinated yet`
                : `${fmtInt(stuck)} children found have not been referred yet`
            }
            action={{ label: 'Open the child journey', onClick: () => openLineList() }}
          >
            That is {fmtPct(pct(stuck, wait), 0)} of the {fmtInt(wait)} still waiting, so{' '}
            {stuckAfterReferral ? 'follow-up after referral' : 'getting children referred'} matters most.{' '}
            {fmtPct(z.referralCompletion, 0) === fmtPct(u.referralCompletion, 0)
              ? `${fmtPct(z.referralCompletion, 0)} of referred children, zero-dose and under-immunised alike, were vaccinated after referral.`
              : `Of children referred, ${fmtPct(z.referralCompletion, 0)} of zero-dose and ${fmtPct(u.referralCompletion, 0)} of under-immunised were vaccinated after referral.`}
          </Insight>

          {top ? (
            <Insight
              icon={MapPinned}
              tone="amber"
              kicker="Where to act first"
              title={`${place(top)} has the most children waiting: ${fmtInt(waiting(top))}`}
              action={{ label: `Open ${top.label}`, onClick: () => openLineList({ stateId: top.stateId, lgaId: top.key }) }}
            >
              {fmtPct(pct(waiting(top), wait), 0)} of all children still waiting are here.
              {next.length > 0 &&
                ` Next: ${next
                  .slice(0, 2)
                  .map((r) => `${place(r)} (${fmtInt(waiting(r))})`)
                  .join(' and ')}.`}
            </Insight>
          ) : (
            <Insight icon={MapPinned} tone="green" kicker="Where to act first" title="No children are waiting">
              Every child found so far has been vaccinated.
            </Insight>
          )}

          {h.last && h.tgt && h.lowest ? (
            <Insight
              icon={Target}
              tone="zdc"
              kicker={`Targets in ${monthLabel(h.last)}`}
              title={`${h.onTrack} of ${h.targeted.length} LGAs reached at least ${ON_TRACK}% of their zero-dose target`}
              badge={<Chip rag={rag(h.tgt.total.zdc.achievement, ON_TRACK, 70)}>{fmtPct(h.tgt.total.zdc.achievement, 0)} overall</Chip>}
              action={{ label: `Review ${monthLabel(h.last, true)} targets`, onClick: () => openSupervisory(h.lastKey) }}
            >
              Furthest behind: {place(h.lowest)} at {fmtPct(h.lowest.zdc.achievement, 0)}. All LGAs together reached{' '}
              {fmtPct(h.tgt.total.uic.achievement, 0)} of the under-immunised target.
            </Insight>
          ) : (
            <Insight icon={Target} tone="zdc" kicker="Targets" title="No complete month yet">
              Targets are monthly and judged once a month is over. The first result arrives after {monthLabel(meta.firstMonth)}.
            </Insight>
          )}

          {h.last && h.foundLast !== null ? (
            <Insight
              icon={change && change.dir === 'down' ? TrendingDown : TrendingUp}
              tone={change?.good === false ? 'red' : 'green'}
              kicker="Month on month"
              title={`Teams found ${fmtInt(h.foundLast)} children in ${monthLabel(h.last)}`}
              badge={<DeltaPill delta={change} />}
              action={{ label: `See ${monthLabel(h.last, true)} in the line list`, onClick: () => openLineList({ period: h.lastKey }) }}
            >
              {h.before && h.foundBefore !== null ? `Against ${fmtInt(h.foundBefore)} in ${monthLabel(h.before)}.` : 'The first complete month of the programme.'}
              {h.foundThisMonth !== null && ` So far this month: ${fmtInt(h.foundThisMonth)} found up to ${dateLabel(h.thisMonth.cutoff)}.`}
            </Insight>
          ) : (
            <Insight icon={TrendingUp} tone="green" kicker="This month" title={`Teams have found ${fmtInt(total)} children so far`}>
              Month-on-month comparisons start once {monthLabel(meta.firstMonth)} is complete.
            </Insight>
          )}
        </div>

        <SectionHead className="mt-14" title="Two dashboards, two questions" hint="Both filter by period, state and LGA, and drill from LGA down to ward and settlement." />
        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Door
            to="/line-list"
            icon={ListChecks}
            tone="zdc"
            question="Where do we stand?"
            name="Line list dashboard"
            source="From the Optimus line list"
            items={[
              'Children found, vaccinated and still waiting',
              'The journey from found to referred to vaccinated',
              'Where to act first, by number still waiting',
              'Scorecard of conversion and referral completion',
            ]}
            stat={`${fmtPct(pct(vacc, total), 0)} of children found are vaccinated`}
          />
          <Door
            to="/supervisory"
            icon={ClipboardCheck}
            tone="uic"
            question="Are we on target?"
            name="Supervisory checklist dashboard"
            source="From supervisory checklist reports"
            items={[
              'Monthly zero-dose and under-immunised target progress',
              'Penta1 and Penta3 given to the children found',
              'Community engagement: households and rumours',
              'Every vaccine dose given, by LGA',
            ]}
            stat={`${fmtInt(h.reportsThisMonth)} checklist reports so far this month`}
          />
        </div>

        <SectionHead className="mt-14" title="How we count" hint="The same rules apply on every page. Rates are worked out from totals, never averaged." />
        <dl className="mt-5 grid grid-cols-1 gap-x-8 gap-y-5 rounded-[20px] bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-12px_rgba(16,24,40,0.10)] sm:grid-cols-2 lg:grid-cols-3">
          {DEFINITIONS.map(([term, def, color]) => (
            <div key={term}>
              <dt className="flex items-center gap-2 text-[14px] font-bold">
                {color && <i className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} />}
                {term}
              </dt>
              <dd className="mt-1 text-[13.5px] leading-relaxed text-[#475467]">{def}</dd>
            </div>
          ))}
        </dl>
      </main>

      <footer className="border-t border-[#EAECF0] bg-white">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-5 text-[12.5px] text-[#667085] sm:px-6 lg:px-8">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5 text-[#98A2B3]" aria-hidden /> Data cut-off <b className="font-semibold text-[#101828]">{dateLabel(meta.asOf)}</b>
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-[#98A2B3]" aria-hidden /> Last refresh <b className="font-semibold text-[#101828]">{fmtDateTime(meta.lastRefresh)}</b>
          </span>
          <span className="flex items-center gap-1.5">
            <Database className="h-3.5 w-3.5 text-[#98A2B3]" aria-hidden /> Optimus line list and supervisory checklists
          </span>
          {meta.source === 'mock' && (
            <span className="rounded-full bg-[#FFFAEB] px-2 py-0.5 text-[11.5px] font-semibold text-[#B54708] ring-1 ring-inset ring-[#FEDF89] sm:ml-auto">
              Demo data — not real programme figures
            </span>
          )}
        </div>
      </footer>
    </div>
  );
}

const DEFINITIONS: [string, string, string | null][] = [
  ['Zero-dose child (ZDC)', 'Aged 12–23 months and has never had Penta1.', PALETTE.zdc],
  ['Under-immunised child (UIC)', 'Aged 12–23 months, has had Penta1 but not Penta3.', PALETTE.uic],
  ['Vaccinated', 'A verified Penta1 (zero-dose) or Penta3 (under-immunised) dose, given on or after the day the child was found.', null],
  ['Conversion', 'Children vaccinated out of children found.', null],
  ['Referral completion', 'Referred children vaccinated after their referral, out of all children referred.', null],
  ['Target reached', 'Children found in a month against the LGA’s monthly target. Not prorated, and it can pass 100%.', null],
];

/** Where every child found so far stands now: vaccinated, referred and waiting, or not yet referred. */
function StandPanel({
  total,
  vaccinated,
  referred,
  notReferred,
  asOf,
  zdc,
  uic,
}: {
  total: number;
  vaccinated: number;
  referred: number;
  notReferred: number;
  asOf: string;
  zdc: { found: number; conversion: number | null };
  uic: { found: number; conversion: number | null };
}) {
  const parts = [
    { label: 'Vaccinated', n: vaccinated, color: PALETTE.green },
    { label: 'Referred, not yet vaccinated', n: referred, color: PALETTE.amber },
    { label: 'Not yet referred', n: notReferred, color: PALETTE.red },
  ];
  const share = (n: number) => (total ? (n / total) * 100 : 0);
  return (
    <section aria-label="Where every child stands" className="rounded-[20px] bg-white/[0.04] p-6 ring-1 ring-inset ring-white/10">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[15px] font-bold">Where every child stands</h2>
        <span className="text-[12px] text-[#8A97B1]">Programme to date · to {asOf}</span>
      </div>
      <p className="mt-4 text-[44px] font-semibold leading-none tracking-[-0.02em] tabular">{fmtInt(total)}</p>
      <p className="mt-1.5 text-[13px] text-[#8A97B1]">children found</p>

      <div className="mt-5 flex h-3 gap-[3px] overflow-hidden rounded-full" role="img" aria-label={parts.map((p) => `${p.label}: ${fmtInt(p.n)}`).join(', ')}>
        {parts
          .filter((p) => p.n > 0)
          .map((p) => (
            <span key={p.label} className="h-full first:rounded-l-full last:rounded-r-full" style={{ width: `${share(p.n)}%`, background: p.color }} />
          ))}
      </div>
      <ul className="mt-4 flex flex-col gap-2.5">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center gap-2.5 text-[13.5px]">
            <i className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: p.color }} />
            <span className="text-[#C9D2E3]">{p.label}</span>
            <span className="ml-auto font-semibold tabular">{fmtInt(p.n)}</span>
            <span className="w-11 text-right text-[12.5px] text-[#8A97B1] tabular">{fmtPct(share(p.n), 0)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/10 pt-5">
        {(
          [
            ['Zero-dose', zdc, PALETTE.zdc],
            ['Under-immunised', uic, PALETTE.uic],
          ] as const
        ).map(([label, g, color]) => (
          <div key={label}>
            <p className="flex items-center gap-1.5 text-[12px] text-[#8A97B1]">
              <i className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />
              {label}
            </p>
            <p className="mt-1 text-[20px] font-semibold tabular">{fmtInt(g.found)}</p>
            <p className="text-[12px] text-[#8A97B1]">{fmtPct(g.conversion, 0)} vaccinated</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function SectionHead({ title, hint, className }: { title: string; hint: string; className?: string }) {
  return (
    <div className={className}>
      <h2 className="text-[22px] font-bold tracking-[-0.01em]">{title}</h2>
      <p className="mt-0.5 text-[13.5px] text-[#667085]">{hint}</p>
    </div>
  );
}

const CARD = 'rounded-[20px] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-12px_rgba(16,24,40,0.10)]';

/** One finding: a plain sentence with its numbers, and a link to the view that shows it. */
function Insight({
  icon: Icon,
  tone,
  kicker,
  title,
  badge,
  action,
  children,
}: {
  icon: LucideIcon;
  tone: Tone;
  kicker: string;
  title: string;
  badge?: ReactNode;
  action?: { label: string; onClick: () => void };
  children: ReactNode;
}) {
  return (
    <article className={cn(CARD, 'flex flex-col')}>
      <div className="flex items-center gap-2.5">
        <span className={cn('grid h-8 w-8 flex-shrink-0 place-items-center rounded-full', TONE[tone].chip)}>
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <p className="text-[11.5px] font-bold uppercase tracking-[0.06em] text-[#667085]">{kicker}</p>
        {badge && <span className="ml-auto">{badge}</span>}
      </div>
      <h3 className="mt-3.5 text-[18px] font-bold leading-snug tracking-[-0.01em]">{title}</h3>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#475467]">{children}</p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-auto inline-flex items-center gap-1 self-start pt-4 text-[13px] font-semibold text-[#3D5AFE] hover:text-[#2A40C9]"
        >
          {action.label} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </button>
      )}
    </article>
  );
}

/** Way into a dashboard: the question it answers, what is inside and one live figure. */
function Door({
  to,
  icon: Icon,
  tone,
  question,
  name,
  source,
  items,
  stat,
}: {
  to: string;
  icon: LucideIcon;
  tone: Tone;
  question: string;
  name: string;
  source: string;
  items: string[];
  stat: string;
}) {
  return (
    <Link to={to} className={cn(CARD, 'group flex flex-col p-6 transition-shadow hover:shadow-[0_1px_2px_rgba(16,24,40,0.06),0_16px_32px_-12px_rgba(16,24,40,0.22)]')}>
      <div className="flex items-center gap-3">
        <span className={cn('grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl', TONE[tone].chip)}>
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 leading-tight">
          <p className="text-[14px] font-bold">{name}</p>
          <p className="text-[12px] text-[#667085]">{source}</p>
        </div>
      </div>
      <p className="mt-5 text-[28px] font-extrabold tracking-[-0.02em]">{question}</p>
      <ul className="mt-3 flex flex-col gap-1.5 text-[13.5px] text-[#475467]">
        {items.map((i) => (
          <li key={i} className="flex gap-2">
            <Check className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: TONE[tone].color }} aria-hidden />
            {i}
          </li>
        ))}
      </ul>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#EAECF0] pt-4">
        <span className="text-[13px] font-semibold text-[#101828]">{stat}</span>
        <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#3D5AFE]">
          Open <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </span>
      </div>
    </Link>
  );
}
