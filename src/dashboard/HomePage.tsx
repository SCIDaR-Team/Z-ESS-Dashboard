import { useMemo, useState, useEffect, type ReactNode } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, CalendarDays, Check, ChevronRight, ClipboardCheck, Clock, Info, ListChecks, MapPin, Menu, ShieldCheck, Syringe, Target, UsersRound, Waypoints } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Dataset } from '@/data/normalise';
import { completeMonths, currentMonth, dateLabel, monthLabel, prevMonth, rangeKey, resolvePeriod, type PeriodKey } from '@/data/period';
import { pathwayRates, summariseLineList, waitingSplit, type LineListRow } from '@/data/calc/lineList';
import type { Scope } from '@/data/calc/scope';
import { summariseSupervisory } from '@/data/calc/supervisory';
import { summariseTargets } from '@/data/calc/targets';
import { pct } from '@/data/calc/rates';
import { getState, STATES } from '@/data/reference/geography';
import { fmtDateTime, fmtInt, fmtPct } from '@/lib/format';
import { useFilterStore } from '@/store/filterStore';
import { delta, waiting } from './common';
import { DeltaPill } from './kit';
import { WorkspaceNav } from './WorkspaceNav';
import { AppearanceControl } from './AppearanceControl';
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
      trend: complete.slice(-6).map((m) => ({ month: m, total: summariseLineList(ds, ALL, resolvePeriod(`month:${m}`, meta)).total })),
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

export function HomePage({ ds }: { ds: Dataset }) {
  const h = useHomeFacts(ds);
  const navigate = useNavigate();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setNavOpen(false); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);
  const setLineList = useFilterStore((s) => s.setLineList);
  const setSupervisory = useFilterStore((s) => s.setSupervisory);
  const { T, split, meta } = h;
  const total = found(T);
  const vacc = vaccinated(T);
  const wait = split.referred + split.notReferred;
  const conversion = pct(vacc, total);
  const change = h.foundLast !== null ? delta(h.foundLast, h.foundBefore, 'count') : null;
  const z = pathwayRates(T.zdc);
  const u = pathwayRates(T.uic);
  const priorities = h.byWait.slice(0, 3);
  const maxWaiting = Math.max(1, ...priorities.map(waiting));
  const trendMax = Math.max(1, ...h.trend.map((m) => found(m.total)));

  useEffect(() => {
    if (location.hash === '#definitions') {
      setGuideOpen(true);
      document.getElementById('definitions')?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [location.hash]);

  const openLineList = (patch: { stateId?: string | null; lgaId?: string | null; period?: PeriodKey | null } = {}) => {
    setLineList({ stateId: null, lgaId: null, wardId: null, settlementId: null, period: null, ...patch });
    navigate('/line-list');
  };
  const openSupervisory = () => {
    setSupervisory({ stateId: null, lgaId: null, period: h.lastKey });
    navigate('/supervisory');
  };

  return <div className="workspace overview-page">
    <a href="#main-content" className="skip-link">Skip to content</a>
    <aside className={`workspace-sidebar ${navOpen ? 'mobile-open' : ''}`} aria-label="Workspace"><WorkspaceNav onClose={() => setNavOpen(false)} /></aside>
    {navOpen && <button type="button" className="nav-backdrop" aria-label="Close navigation" onClick={() => setNavOpen(false)} />}
    <div className="workspace-body">
      <header className="workspace-topbar">
        <div className="topbar-breadcrumb"><button type="button" className="mobile-menu-button" aria-label="Open navigation" aria-expanded={navOpen} onClick={() => setNavOpen(true)}><Menu size={20} /></button><span>Workspace</span><ChevronRight size={14} /><strong>Overview</strong></div>
        <div className="topbar-meta">{meta.source === 'mock' && <span className="demo-badge"><i />Demo workspace</span>}<AppearanceControl /><span className="topbar-date"><CalendarDays size={15} />{dateLabel(meta.asOf)}</span><span className="workspace-avatar" title="Z-ESS programme">Z</span></div>
      </header>
      <main id="main-content" className="overview-content">
        <div className="overview-heading"><div><p className="eyebrow">THE BIG PICTURE</p><h1>Programme overview<span>.</span></h1><p>A little clarity. A bigger impact. Every child, accounted for.</p></div><span className="period-label"><CalendarDays size={15} />Programme to date</span></div>
        <section className="programme-hero" aria-labelledby="mission-title">
          <div className="hero-copy"><span className="hero-kicker"><i />REACHING THE UNREACHED</span><h2 id="mission-title">Every missed child.<br />A chance to <em>thrive.</em></h2><p>Find them. Follow up. Close the gap.<br />Your programme’s progress, all in one place.</p><button type="button" className="hero-action" onClick={() => openLineList()}>Explore the line list <ArrowUpRight size={17} /></button><div className="hero-footnote"><MapPin size={14} />{h.states.join(' & ') || 'Programme areas'}<span>·</span>{h.lgasReached} LGAs reached</div></div>
          <div className="hero-progress"><div className="progress-orbit" role="img" aria-label={`${fmtPct(conversion, 0)} of identified children vaccinated`}><svg viewBox="0 0 220 220" aria-hidden><circle className="orbit-track" cx="110" cy="110" r="94" /><circle className="orbit-value" cx="110" cy="110" r="94" pathLength="100" strokeDasharray={`${Math.min(100, Math.max(0, conversion ?? 0))} 100`} /></svg><div className="orbit-label"><ShieldCheck size={25} /><strong>{fmtPct(conversion, 0)}</strong><span>of children found<br />now vaccinated</span></div><span className="orbit-spark">✦</span></div><p><span className="live-dot" />{fmtInt(vacc)} small steps. A lasting difference.</p></div>
        </section>

        <div className="overview-stat-grid">
          <OverviewStat icon={UsersRound} label="Children identified" value={fmtInt(total)} tone="blue" note={<><span className="stat-dot blue" />Zero-dose & under-immunised</>} />
          <OverviewStat icon={Syringe} label="Children vaccinated" value={fmtInt(vacc)} tone="green" note={<><span className="stat-dot green" />{fmtPct(conversion, 0)} of children identified</>} />
          <OverviewStat icon={Clock} label="Awaiting vaccination" value={fmtInt(wait)} tone="amber" note={<><span className="stat-dot amber" />Every follow-up matters</>} />
          <OverviewStat icon={MapPin} label="Settlements reached" value={fmtInt(T.settlements)} tone="purple" note={<><span className="stat-dot purple" />Across {h.lgasReached} local government areas</>} />
        </div>

        <div className="overview-middle-grid">
          <section className="overview-panel journey-panel"><div className="panel-heading"><div><p className="eyebrow">FROM FOUND TO PROTECTED</p><h2>The child journey</h2></div><button type="button" className="icon-link" aria-label="Explore child journey" onClick={() => openLineList()}><ArrowUpRight size={19} /></button></div><p className="panel-description">Where children stand, and where follow-up can help.</p>
            <div className="journey-track" role="img" aria-label={`${fmtInt(vacc)} vaccinated, ${fmtInt(split.referred)} referred and waiting, ${fmtInt(split.notReferred)} not yet referred`}>{[{ n: vacc, color: '#27866c' }, { n: split.referred, color: '#e8b75a' }, { n: split.notReferred, color: '#dddcd3' }].map((p, i) => p.n > 0 && <span key={i} style={{ flex: p.n, background: p.color }} />)}</div>
            <div className="journey-key">{[{ label: 'Vaccinated', n: vacc, color: 'green' }, { label: 'Referred, waiting', n: split.referred, color: 'amber' }, { label: 'Not yet referred', n: split.notReferred, color: 'gray' }].map((p) => <div key={p.label}><span><i className={`stat-dot ${p.color}`} />{p.label}</span><strong>{fmtInt(p.n)}</strong><small>{fmtPct(pct(p.n, total), 0)} of identified</small></div>)}</div>
            <div className="journey-cohorts"><div><span className="cohort-label"><i className="stat-dot blue" />Zero-dose</span><strong>{fmtInt(T.zdc.identified)}</strong><small>{fmtPct(z.conversion, 0)} vaccinated</small></div><div><span className="cohort-label"><i className="stat-dot green" />Under-immunised</span><strong>{fmtInt(T.uic.identified)}</strong><small>{fmtPct(u.conversion, 0)} vaccinated</small></div></div>
          </section>
          <section className="overview-panel priority-panel"><div className="panel-heading"><div><p className="eyebrow">MAKE THE NEXT MOVE</p><h2>A little more attention</h2></div><span className="attention-icon"><Waypoints size={18} /></span></div><p className="panel-description">LGAs with the most children awaiting vaccination.</p><div className="priority-list">{priorities.length ? priorities.map((r, i) => <button type="button" key={r.key} className="priority-row" onClick={() => openLineList({ stateId: r.stateId, lgaId: r.key })}><span className="priority-rank">0{i + 1}</span><span className="priority-place"><strong>{r.label}</strong><small>{getState(r.stateId)?.name}</small><span className="priority-bar"><i style={{ width: `${waiting(r) / maxWaiting * 100}%` }} /></span></span><span className="priority-count"><strong>{fmtInt(waiting(r))}</strong><small>waiting</small></span><ChevronRight size={15} /></button>) : <p className="empty-priorities"><Check size={20} />Every child found has been vaccinated.</p>}</div><button type="button" className="text-link" onClick={() => openLineList()}>View all LGAs <ArrowRight size={15} /></button></section>
        </div>

        <div className="section-title-row"><div><h2>Go a little deeper</h2><p>Two perspectives. One shared goal.</p></div><span className="section-aside">YOUR DASHBOARDS <ArrowDownDecoration /></span></div>
        <div className="dashboard-door-grid">
          <Link to="/line-list" className="dashboard-door"><div className="door-content"><span className="door-icon blue"><ListChecks size={21} /></span><span className="door-number">01 / IDENTIFY & FOLLOW UP</span><h3>Where do we stand?</h3><p>Follow each child’s journey and see where<br className="desktop-break" /> your teams can make the greatest difference.</p><span className="door-link">Line list dashboard <ArrowUpRight size={17} /></span></div><div className="door-chart" aria-label="Children identified by complete month">{h.trend.length ? <><div className="mini-bars">{h.trend.map((m) => <span key={m.month} title={`${monthLabel(m.month)}: ${fmtInt(found(m.total))} identified`}><i style={{ height: `${Math.max(3, found(m.total) / trendMax * 100)}%` }} /><small>{monthLabel(m.month, true).slice(0, 3)}</small></span>)}</div><span className="mini-chart-caption">Monthly identification</span></> : <span className="mini-chart-caption">Monthly trends appear after the first complete month.</span>}</div></Link>
          <Link to="/supervisory" className="dashboard-door supervisory-door"><div className="door-content"><span className="door-icon green"><ClipboardCheck size={21} /></span><span className="door-number">02 / MONITOR & IMPROVE</span><h3>Are we on target?</h3><p>Bring targets, vaccine delivery and community<br className="desktop-break" /> engagement into one clear view.</p><span className="door-link">Supervisory checklist <ArrowUpRight size={17} /></span></div><div className="door-target"><Target size={26} /><strong>{h.tgt ? fmtPct(h.tgt.total.zdc.achievement, 0) : '—'}</strong><span>Zero-dose target reached</span><small>{h.last ? monthLabel(h.last, true) : 'No complete month yet'}</small></div></Link>
        </div>

        <section className="programme-note"><span className="note-icon"><Info size={20} /></span><div><h3>{h.last && h.foundLast !== null ? `${fmtInt(h.foundLast)} children identified in ${monthLabel(h.last)}` : 'Your programme is getting started'}</h3><p>{h.before && h.foundBefore !== null ? `Compared with ${fmtInt(h.foundBefore)} in ${monthLabel(h.before)}. ` : 'Monthly comparisons appear after the first complete month. '}{h.tgt && `${h.onTrack} of ${h.targeted.length} LGAs reached at least ${ON_TRACK}% of their zero-dose target.`}</p></div><DeltaPill delta={change} /><button type="button" className="text-link" onClick={openSupervisory}>Review targets <ArrowRight size={15} /></button></section>

        <details id="definitions" className="programme-definitions" open={guideOpen} onToggle={(e) => setGuideOpen(e.currentTarget.open)}><summary><BookIcon /><span>Behind the numbers<small>A shared understanding of how we count.</small></span><ChevronRight size={17} /></summary><dl>{DEFINITIONS.map(([term, definition]) => <div key={term}><dt>{term}</dt><dd>{definition}</dd></div>)}</dl></details>
        <footer className="overview-footer"><span>Z-ESS · Every child, accounted for.</span><span>Data cut-off: {dateLabel(meta.asOf)}<span className="footer-divider">/</span>Updated {fmtDateTime(meta.lastRefresh)}</span></footer>
        {meta.source === 'mock' && <p className="demo-disclosure">Demonstration data for design preview. These are not real programme figures.</p>}
      </main>
    </div>
  </div>;
}

function OverviewStat({ icon: Icon, label, value, note, tone }: { icon: LucideIcon; label: string; value: string; note: ReactNode; tone: string }) {
  return <section className="overview-stat"><div><span>{label}</span><span className={`stat-icon ${tone}`}><Icon size={18} /></span></div><strong>{value}</strong><p>{note}</p></section>;
}
function ArrowDownDecoration() { return <ArrowRight size={14} className="rotate-90" aria-hidden />; }
function BookIcon() { return <Info size={19} aria-hidden />; }
const DEFINITIONS = [
  ['Zero-dose child (ZDC)', 'Aged 12–23 months and has never had Penta1.'],
  ['Under-immunised child (UIC)', 'Aged 12–23 months, has had Penta1 but not Penta3.'],
  ['Vaccinated', 'A verified Penta1 (zero-dose) or Penta3 (under-immunised) dose, given on or after identification.'],
  ['Conversion', 'Children vaccinated divided by children identified.'],
  ['Referral completion', 'Referred children vaccinated after referral, divided by all referred children.'],
  ['Target reached', 'Children identified against the monthly LGA target. Not prorated; it can exceed 100%.'],
];
