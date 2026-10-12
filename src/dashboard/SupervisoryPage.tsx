import { Fragment, useState } from 'react';
import { CheckCircle2, ClipboardList, Home, MapPin, MessageCircle, Syringe, TrendingUp, UsersRound } from 'lucide-react';
import type { Dataset } from '@/data/normalise';
import { dateLabel, monthLabel, periodRangeLabel } from '@/data/period';
import { supervisoryRates } from '@/data/calc/supervisory';
import { getLga } from '@/data/reference/geography';
import { ANTIGENS, OTHER_ANTIGENS } from '@/data/types';
import { fmtDateTime, fmtInt, fmtPct } from '@/lib/format';
import { cn } from '@/lib/cn';
import { fromOption, lgaOptions, stateOptions, toOption, plural } from './filters';
import { areaName, crumbs, geoOnly, LEVEL_LABEL, useSupervisoryData } from './common';
import { Check, FilterSelect, PeriodChip, PeriodFilter, Shell } from './ui';
import { Card, Crumbs } from './kit';
import { CELL, NUM_CELL, TOTAL_CELL } from './theme';
import { BRIEF_BLUE, BRIEF_GREEN, BriefBars, BriefKpi, BriefPanel, BriefRateCell, BriefTarget, ChartViewSelect } from './BriefLayout';

const SOURCE = 'Supervisory checklist';

export function SupervisoryPage({ ds }: { ds: Dataset }) {
  const { f, set, periodKey, period, sup, tgt, level, drill } = useSupervisoryData(ds);
  const [doseView, setDoseView] = useState<'all' | 'penta1' | 'penta3'>('all');
  const [childView, setChildView] = useState<'both' | 'zdc' | 'uic'>('both');
  const T = sup.total;
  const R = supervisoryRates(T);
  const name = areaName(ds, f);
  const unit = LEVEL_LABEL[level];
  const unitLower = level === 'lga' ? 'LGA' : unit.toLowerCase();
  const totalLabel = level === 'lga' ? 'All LGAs' : 'Total';
  const silent = (level === 'lga' ? sup.rows : []).filter((r) => r.reports === 0);
  const pick = level === 'lga' ? (key: string) => { const patch = drill(key); if (patch) set(patch); } : undefined;
  const basis = period.partial
    ? `Month to date (${periodRangeLabel(period)}) against the full-month target`
    : period.months.length > 1
      ? `${monthLabel(period.months[0], true)} – ${monthLabel(period.months[period.months.length - 1], true)} against the sum of monthly targets`
      : `${monthLabel(period.months[0])} against the monthly target`;
  const context = `${periodRangeLabel(period)} · ${SOURCE}`;
  const childTitle = `${childView === 'both' ? 'ZDC & UIC' : childView.toUpperCase()} identified by ${unit}`;
  const childSeries = [
    ...(childView !== 'uic' ? [{ label: 'ZDC identified', color: BRIEF_BLUE }] : []),
    ...(childView !== 'zdc' ? [{ label: 'UIC identified', color: BRIEF_GREEN }] : []),
  ];
  const doseSeries = doseView === 'all'
    ? [{ label: 'Penta1 administered', color: BRIEF_BLUE }, { label: 'Penta3 administered', color: BRIEF_GREEN }]
    : [{ label: `All ${doseView === 'penta1' ? 'Penta1' : 'Penta3'} doses`, color: '#B5D5ED' }, { label: doseView === 'penta1' ? 'Penta1 to ZDC' : 'Penta3 to UIC', color: doseView === 'penta1' ? BRIEF_BLUE : BRIEF_GREEN }];

  const filters = <>
    <PeriodFilter value={periodKey} onChange={(k) => set({ period: k })} meta={ds.meta} />
    <FilterSelect label="State" value={toOption(f.stateId)} options={stateOptions()} onChange={(v) => set({ stateId: fromOption(v) })} />
    <FilterSelect label="LGA" value={toOption(f.lgaId)} options={lgaOptions(f.stateId)} onChange={(v) => set({ lgaId: fromOption(v) })} />
  </>;

  return <Shell
    page={{ title: 'Supervisory checklist dashboard', subtitle: 'Supervisory checklist & monthly target progress', source: SOURCE }}
    inlineFilters meta={ds.meta} filters={filters}
    period={<PeriodChip value={periodKey} onChange={(k) => set({ period: k })} meta={ds.meta} />}
    activeFilters={[f.stateId, f.lgaId, f.period && f.period !== 'this-month' ? f.period : null].filter(Boolean).length}
    onResetFilters={() => set({ stateId: null, lgaId: null, period: null })}
  >
    <Crumbs items={crumbs(ds, f)} onPick={(c) => c.patch && set(geoOnly(c.patch))} />
    <p className="brief-report-context">{name} · {context} · Data cut-off: {ds.meta.asOf} · Last refresh: {fmtDateTime(ds.meta.lastRefresh)}</p>
    <div className="brief-headlines brief-supervisory-headlines" aria-label="Supervisory headline indicators">
      <BriefKpi label="Settlements covered" value={fmtInt(T.settlements)} icon={MapPin} />
      <BriefKpi label="Penta1 administered" value={fmtInt(T.doses.Penta1)} icon={Syringe} color={BRIEF_GREEN} />
      <BriefKpi label="Penta1 given to ZDC" value={fmtInt(T.penta1ToZdc)} icon={UsersRound} color="#E99A2E" />
      <BriefKpi label="Penta3 administered" value={fmtInt(T.doses.Penta3)} icon={Syringe} />
      <BriefKpi label="Penta3 given to UIC" value={fmtInt(T.penta3ToUic)} icon={UsersRound} color={BRIEF_GREEN} />
      <BriefKpi label="Zero-dose children identified" value={fmtInt(T.zdcIdentified)} icon={UsersRound} color="#E99A2E" />
      <BriefKpi label="Under-immunised children identified" value={fmtInt(T.uicIdentified)} icon={UsersRound} />
    </div>
    <div className="brief-headlines brief-community-headlines" aria-label="Community engagement indicators">
      <BriefKpi label="Non-compliant households identified" value={fmtInt(T.households.identified)} icon={Home} color="#D95864" />
      <BriefKpi label="Non-compliant households followed up" value={fmtInt(T.households.followedUp)} icon={ClipboardList} color="#E99A2E" />
      <BriefKpi label="Non-compliant households converted" value={fmtInt(T.households.converted)} icon={CheckCircle2} color={BRIEF_GREEN} />
      <BriefKpi label="RI rumours identified" value={fmtInt(T.rumours.identified)} icon={MessageCircle} />
      <BriefKpi label="RI rumours addressed" value={fmtInt(T.rumours.addressed)} icon={CheckCircle2} color={BRIEF_GREEN} />
      <BriefKpi label="Household conversion %" value={fmtPct(R.householdConversion)} icon={TrendingUp} color="#9C66C3" />
      <BriefKpi label="RI rumour resolution %" value={fmtPct(R.rumourResolution)} icon={TrendingUp} color={BRIEF_GREEN} />
    </div>

    <div className="brief-supervisory-charts">
      <BriefPanel title={`Penta1 and Penta3 by ${unit}`} action={<ChartViewSelect label="Vaccine comparison" value={doseView} onChange={setDoseView} options={[{ value: 'all', label: 'Penta1 & Penta3' }, { value: 'penta1', label: 'Penta1 · ZDC comparison' }, { value: 'penta3', label: 'Penta3 · UIC comparison' }]} />}>
        <BriefBars label="Penta dose comparison" series={doseSeries} rows={sup.rows.map((r) => ({ key: r.key, label: r.label,
          values: doseView === 'all' ? [r.doses.Penta1, r.doses.Penta3] : doseView === 'penta1' ? [r.doses.Penta1, r.penta1ToZdc] : [r.doses.Penta3, r.penta3ToUic],
          flagged: doseView === 'penta1' ? r.penta1ToZdc > r.doses.Penta1 : doseView === 'penta3' && r.penta3ToUic > r.doses.Penta3,
        }))} onPick={pick} />
      </BriefPanel>
      <BriefPanel title={childTitle} action={<ChartViewSelect label="Supervisory child view" value={childView} onChange={setChildView} options={[{ value: 'both', label: 'ZDC & UIC' }, { value: 'zdc', label: 'Zero-dose (ZDC)' }, { value: 'uic', label: 'Under-immunised (UIC)' }]} />}>
        <BriefBars label="ZDC and UIC identified comparison" series={childSeries} rows={sup.rows.map((r) => ({ key: r.key, label: r.label, values: [
          ...(childView !== 'uic' ? [r.zdcIdentified] : []), ...(childView !== 'zdc' ? [r.uicIdentified] : []),
        ] }))} onPick={pick} />
      </BriefPanel>
      <BriefPanel title={period.months.length > 1 ? 'Target progress' : 'Monthly target progress'}>
        <div className="brief-targets"><BriefTarget label="Zero-dose target" progress={tgt.total.zdc} color={BRIEF_BLUE} /><BriefTarget label="Under-immunised target" progress={tgt.total.uic} color={BRIEF_GREEN} /></div>
        <p className="brief-target-basis">{basis}. Achievement percentages can exceed 100%.</p>
      </BriefPanel>
      <BriefPanel title="Other antigens administered">
        <BriefBars label="Other antigen doses" series={[{ label: 'Doses administered', color: BRIEF_BLUE }]} rows={OTHER_ANTIGENS.map((a) => ({ key: a, label: a, values: [T.doses[a]] }))} />
      </BriefPanel>
    </div>

    <Card className="mt-4 brief-summary" title="LGA target progress summary" hint={`${basis} · counts and dose outcomes shown separately · click a row to drill in`}>
      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Scroll target progress summary">
        <table className="brief-detail-table w-full min-w-[1150px] text-[12px]" aria-label="LGA target progress summary">
          <thead><tr>{['LGA', 'ZDC target', 'Actual ZDC', 'ZDC achievement %', 'ZDC remaining', 'UIC target', 'Actual UIC', 'UIC achievement %', 'UIC remaining', 'Settlements covered', 'Penta1 to ZDC', 'Penta3 to UIC'].map((h) => <th scope="col" key={h}>{h}</th>)}</tr></thead>
          <tbody>{[...tgt.rows, { ...tgt.total, key: 'total', label: 'All LGAs' }].map((r) => <tr key={r.key} className={r.key === 'total' ? 'brief-total' : 'brief-drill-row'} onClick={() => r.key !== 'total' && set({ stateId: getLga(r.key)!.stateId, lgaId: r.key })}>
            <th scope="row">{r.label}</th><td>{fmtInt(r.zdc.target)}</td><td>{fmtInt(r.zdc.achieved)}</td><td><BriefRateCell value={r.zdc.achievement} color={BRIEF_BLUE} /></td><td>{fmtInt(r.zdc.remaining)}</td>
            <td>{fmtInt(r.uic.target)}</td><td>{fmtInt(r.uic.achieved)}</td><td><BriefRateCell value={r.uic.achievement} color={BRIEF_GREEN} /></td><td>{fmtInt(r.uic.remaining)}</td>
            <td>{fmtInt(r.settlements)}</td><td>{fmtInt(r.penta1ToZdc)}</td><td>{fmtInt(r.penta3ToUic)}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </Card>

    <details className="brief-extra-details"><summary>Community engagement details</summary>
      <Card title={`Community engagement by ${unitLower}`} hint={context}>
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Scroll community engagement details">
          <table id="supervisory-scorecard" aria-label={`${unit} community engagement scorecard`} className="brief-detail-table w-full min-w-[1000px] text-[12px]">
            <thead><tr>{[unit, 'Reports', 'Settlements', 'Households identified', 'Households followed up', 'Households converted', 'Household conversion %', 'Rumours identified', 'Rumours addressed', 'Rumour resolution %'].map((h) => <th scope="col" key={h}>{h}</th>)}</tr></thead>
            <tbody>{[...sup.rows, { ...T, key: 'total', label: totalLabel }].map((r) => {
              const rr = supervisoryRates(r);
              return <tr key={r.key} className={r.key === 'total' ? 'brief-total' : 'brief-drill-row'} onClick={() => r.key !== 'total' && pick?.(r.key)}><th scope="row">{r.label}</th><td>{fmtInt(r.reports)}</td><td>{fmtInt(r.settlements)}</td><td>{fmtInt(r.households.identified)}</td><td>{fmtInt(r.households.followedUp)}</td><td>{fmtInt(r.households.converted)}</td><td>{fmtPct(rr.householdConversion)}</td><td>{fmtInt(r.rumours.identified)}</td><td>{fmtInt(r.rumours.addressed)}</td><td>{fmtPct(rr.rumourResolution)}</td></tr>;
            })}</tbody>
          </table>
        </div>
      </Card>
    </details>
    <details className="brief-extra-details"><summary>Vaccine dose details</summary>
      <Card title={`Vaccine doses by ${unitLower}`} hint={context}>
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Scroll vaccine dose details">
          <table className="brief-detail-table w-full min-w-[1080px] text-[12px]">
            <thead><tr><th scope="col">{unit}</th>{ANTIGENS.flatMap((a) => a === 'Penta1' ? ['Penta1', 'Penta1 to ZDC'] : a === 'Penta3' ? ['Penta3', 'Penta3 to UIC'] : [a]).map((h) => <th key={h} scope="col">{h}</th>)}<th scope="col">Penta1 ZDC share %</th><th scope="col">Penta3 UIC share %</th></tr></thead>
            <tbody>{[...sup.rows, { ...T, key: 'total', label: totalLabel }].map((r) => {
              const rr = supervisoryRates(r);
              const subset = (v: number, total: number) => <td className={cn(CELL, v > total && 'bg-[#FDECEC] text-[#B4232A]')} title={v > total ? 'Subset exceeds total doses — flagged for review' : undefined}>{fmtInt(v)}</td>;
              return <tr key={r.key} className={r.key === 'total' ? 'brief-total' : 'brief-drill-row'} onClick={() => r.key !== 'total' && pick?.(r.key)}><th scope="row">{r.label}</th>{ANTIGENS.map((a) => <Fragment key={a}><td className={r.key === 'total' ? TOTAL_CELL : NUM_CELL}>{fmtInt(r.doses[a])}</td>{a === 'Penta1' && subset(r.penta1ToZdc, r.doses.Penta1)}{a === 'Penta3' && subset(r.penta3ToUic, r.doses.Penta3)}</Fragment>)}<td>{fmtPct(rr.penta1ZdcShare)}</td><td>{fmtPct(rr.penta3UicShare)}</td></tr>;
            })}</tbody>
          </table>
        </div>
      </Card>
    </details>
      <Card id="data-quality" className="mt-4" title="Data quality" hint={`Checks on the ${SOURCE}`}>
        <ul className="flex flex-col gap-2 text-[13px] text-[#344054]">
          <Check ok={sup.exceptions.length === 0}>
            {sup.exceptions.length === 0
              ? 'Penta doses to ZDC/UIC never exceed the total doses given.'
              : `${plural(sup.exceptions.length, 'report')} record more Penta doses to ZDC/UIC than were given in total: ${sup.exceptions
                  .slice(0, 4)
                  .map((e) => `${e.reportId} (${getLga(e.lgaId)?.name}, ${dateLabel(e.sessionDate)}, ${e.dose} ${e.subset} > ${e.total})`)
                  .join('; ')}.`}
          </Check>
          <Check ok={silent.length === 0}>
            {silent.length === 0 ? 'Every LGA reported in this period.' : `No reports this period from ${silent.map((r) => r.label).join(', ')} — shown as zero.`}
          </Check>
        </ul>
      </Card>
  </Shell>;
}
