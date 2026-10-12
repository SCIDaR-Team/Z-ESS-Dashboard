import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, CheckCircle2, ClipboardList, Hourglass, MapPin, Syringe, TrendingUp, UsersRound } from 'lucide-react';
import type { Dataset } from '@/data/normalise';
import { periodRangeLabel } from '@/data/period';
import { pathwayRates, type LineListRow } from '@/data/calc/lineList';
import { getState } from '@/data/reference/geography';
import { fmtInt, fmtPct } from '@/lib/format';
import { cn } from '@/lib/cn';
import { fromOption, lgaOptions, settlementOptions, stateOptions, toOption, wardOptions, plural } from './filters';
import { areaName, crumbs, LEVEL_LABEL, rag, useLineList, waiting } from './common';
import { Check, FilterSelect, PeriodChip, PeriodFilter, Shell } from './ui';
import { Card, Crumbs, RagLegend } from './kit';
import { CELL, NUM_CELL, RAG_CELL, TOTAL_CELL } from './theme';

import { BRIEF_BLUE, BRIEF_GREEN, BriefBars, BriefKpi, BriefPanel, BriefPathway, ChartViewSelect } from './BriefLayout';
import { fmtDateTime } from '@/lib/format';

const SOURCE = 'Optimus line list';

type SortKey = 'name' | 'settlements' | 'zid' | 'zref' | 'zvac' | 'zconv' | 'zrc' | 'uid' | 'uref' | 'uvac' | 'uconv' | 'urc' | 'wait';


export function LineListPage({ ds }: { ds: Dataset }) {
  const { f, set, periodKey, period, s, level, drill } = useLineList(ds);
  const [group, setGroup] = useState<'zdc' | 'uic'>('zdc');
  const [childView, setChildView] = useState<'both' | 'identified' | 'vaccinated'>('both');
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'name', dir: 1 });

  const T = s.total;
  const name = areaName(ds, f);
  const unit = LEVEL_LABEL[level];
  const showState = level === 'lga' && !f.stateId;
  const groupLabel = group.toUpperCase();
  const groupColor = group === 'zdc' ? BRIEF_BLUE : BRIEF_GREEN;
  const childTitle = `${groupLabel} ${childView === 'both' ? 'identified vs vaccinated' : childView} by ${unit}`;
  const childSeries = [
    ...(childView !== 'vaccinated' ? [{ label: `${groupLabel} identified`, color: groupColor }] : []),
    ...(childView !== 'identified' ? [{ label: `${groupLabel} vaccinated`, color: '#2C9466' }] : []),
  ];
  const conversionRows = [...s.rows].sort((a, b) => (pathwayRates(b[group]).conversion ?? -1) - (pathwayRates(a[group]).conversion ?? -1));
  const referrals = T.zdc.referred + T.uic.referred;
  const completedReferrals = T.zdc.vaccinatedAfterReferral + T.uic.vaccinatedAfterReferral;
  const pick = level === 'settlement' && f.settlementId ? undefined : (key: string) => { const patch = drill(key); if (patch) set(patch); };
  const context = `${periodRangeLabel(period)} · ${SOURCE}`;

  const sortVal = (r: LineListRow, k: SortKey): number | string => {
    const z = pathwayRates(r.zdc);
    const u = pathwayRates(r.uic);
    return {
      name: r.label,
      settlements: r.settlements,
      zid: r.zdc.identified,
      zref: r.zdc.referred,
      zvac: r.zdc.vaccinated,
      zconv: z.conversion ?? -1,
      zrc: z.referralCompletion ?? -1,
      uid: r.uic.identified,
      uref: r.uic.referred,
      uvac: r.uic.vaccinated,
      uconv: u.conversion ?? -1,
      urc: u.referralCompletion ?? -1,
      wait: waiting(r),
    }[k];
  };
  const sorted = useMemo(
    () =>
      [...s.rows].sort((a, b) => {
        const x = sortVal(a, sort.key);
        const y = sortVal(b, sort.key);
        return (typeof x === 'string' ? x.localeCompare(y as string) : (x as number) - (y as number)) * sort.dir;
      }),
    [s.rows, sort]
  );

  const unresolved = ds.unresolved.filter((x) => x.source === 'Optimus line list');
  const postRefOk = [...s.rows, T].every((r) => r.zdc.vaccinatedAfterReferral <= r.zdc.referred && r.uic.vaccinatedAfterReferral <= r.uic.referred);

  const filters = (
    <>
      <PeriodFilter value={periodKey} onChange={(k) => set({ period: k })} meta={ds.meta} />
      <FilterSelect label="State" value={toOption(f.stateId)} options={stateOptions()} onChange={(v) => set({ stateId: fromOption(v) })} />
      <FilterSelect label="LGA" value={toOption(f.lgaId)} options={lgaOptions(f.stateId)} onChange={(v) => set({ lgaId: fromOption(v) })} />
      <FilterSelect label="Ward" value={toOption(f.wardId)} options={wardOptions(ds, f.lgaId)} onChange={(v) => set({ wardId: fromOption(v) })} disabled={!f.lgaId} />
      <FilterSelect
        label="Settlement"
        value={toOption(f.settlementId)}
        options={settlementOptions(ds, f.lgaId, f.wardId)}
        onChange={(v) => set({ settlementId: fromOption(v) })}
        disabled={!f.lgaId}
      />
    </>
  );

  const Th = ({ k, children, left }: { k: SortKey; children: string; left?: boolean }) => (
    <th scope="col" className={cn('px-2 py-1.5 font-semibold', left ? 'text-left' : 'text-center')}>
      <button
        type="button"
        onClick={() => setSort((p) => ({ key: k, dir: p.key === k ? ((-p.dir) as 1 | -1) : k === 'name' ? 1 : -1 }))}
        className={cn('inline-flex items-center gap-0.5 hover:text-[#253E33]', sort.key === k && 'text-[#253E33]')}
      >
        {children}
        {sort.key === k && (sort.dir === 1 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
      </button>
    </th>
  );
  const pctCell = (v: number | null) => <td className={cn(CELL, RAG_CELL[rag(v)])}>{fmtPct(v)}</td>;
  const numCell = (v: number) => <td className={NUM_CELL}>{fmtInt(v)}</td>;
  const unitLower = level === 'lga' ? 'LGA' : unit.toLowerCase();

  return (
    <Shell
      page={{
        title: 'Line list dashboard',
        subtitle: 'Zero-dose (ZDC) and under-immunised (UIC) children: identification, referral and vaccination',
        source: SOURCE,
      }}
      inlineFilters
      meta={ds.meta}
      filters={filters}
      period={<PeriodChip value={periodKey} onChange={(k) => set({ period: k })} meta={ds.meta} />}
      activeFilters={[f.stateId, f.lgaId, f.wardId, f.settlementId, f.period && f.period !== 'to-date' ? f.period : null].filter(Boolean).length}
      onResetFilters={() => set({ stateId: null, lgaId: null, wardId: null, settlementId: null, period: null })}
    >
      <Crumbs items={crumbs(ds, f)} onPick={(c) => c.patch && set(c.patch)} />
      <p className="brief-report-context">{name} · {context} · Data cut-off: {ds.meta.asOf} · Last refresh: {fmtDateTime(ds.meta.lastRefresh)}</p>
      <div className="brief-headlines brief-line-headlines" aria-label="Line-list headline indicators">
        <BriefKpi label="Settlements covered" value={fmtInt(T.settlements)} icon={MapPin} />
        <BriefKpi label="ZDC identified" value={fmtInt(T.zdc.identified)} icon={UsersRound} />
        <BriefKpi label="ZDC referred" value={fmtInt(T.zdc.referred)} icon={ClipboardList} />
        <BriefKpi label="ZDC vaccinated" value={fmtInt(T.zdc.vaccinated)} icon={Syringe} color={BRIEF_GREEN} />
        <BriefKpi label="ZDC conversion %" value={fmtPct(pathwayRates(T.zdc).conversion)} icon={TrendingUp} color={BRIEF_GREEN} />
        <BriefKpi label="UIC identified" value={fmtInt(T.uic.identified)} icon={UsersRound} color="#E99A2E" />
        <BriefKpi label="UIC referred" value={fmtInt(T.uic.referred)} icon={ClipboardList} />
        <BriefKpi label="UIC vaccinated" value={fmtInt(T.uic.vaccinated)} icon={Syringe} color={BRIEF_GREEN} />
        <BriefKpi label="UIC conversion %" value={fmtPct(pathwayRates(T.uic).conversion)} icon={TrendingUp} color={BRIEF_GREEN} />
        <BriefKpi label="Referral completion %" value={fmtPct(referrals ? completedReferrals / referrals * 100 : null)} icon={CheckCircle2} color={BRIEF_GREEN} />
      </div>

      <section className="brief-follow-up" aria-labelledby="follow-up-heading">
        <h3 id="follow-up-heading">Follow-up required</h3>
        <div className="brief-follow-up-grid">
          <BriefKpi label="Unconverted ZDC" value={fmtInt(pathwayRates(T.zdc).notVaccinated)} icon={UsersRound} color="#D95864" />
          <BriefKpi label="Referred ZDC pending vaccination" value={fmtInt(pathwayRates(T.zdc).referredPending)} icon={Hourglass} color="#D95864" />
          <BriefKpi label="Unconverted UIC" value={fmtInt(pathwayRates(T.uic).notVaccinated)} icon={UsersRound} color="#E99A2E" />
          <BriefKpi label="Referred UIC pending vaccination" value={fmtInt(pathwayRates(T.uic).referredPending)} icon={Hourglass} color="#D95864" />
        </div>
      </section>

      <div className="brief-chart-controls"><span>Children identified {periodRangeLabel(period)}; outcomes verified to {ds.meta.asOf}.</span></div>
      <div className="brief-line-charts">
        <BriefPanel title={childTitle} action={<ChartViewSelect label="Line-list child view" value={`${group}:${childView}`} onChange={(value) => {
          const [nextGroup, nextView] = value.split(':') as [typeof group, typeof childView];
          setGroup(nextGroup); setChildView(nextView);
        }} options={[
          { value: 'zdc:both', label: 'ZDC · Both outcomes' }, { value: 'zdc:identified', label: 'ZDC · Identified only' }, { value: 'zdc:vaccinated', label: 'ZDC · Vaccinated only' },
          { value: 'uic:both', label: 'UIC · Both outcomes' }, { value: 'uic:identified', label: 'UIC · Identified only' }, { value: 'uic:vaccinated', label: 'UIC · Vaccinated only' },
        ]} />}>
          <BriefBars label={`${groupLabel} ${childView === 'both' ? 'identified vs vaccinated' : childView}`} rows={s.rows.map((r) => ({ key: r.key, label: r.label, values: [
            ...(childView !== 'vaccinated' ? [r[group].identified] : []), ...(childView !== 'identified' ? [r[group].vaccinated] : []),
          ] }))} series={childSeries} onPick={pick} />
        </BriefPanel>
        <BriefPanel title={`${groupLabel} conversion rate by ${unit}`}>
          <BriefBars label={`${groupLabel} conversion ranking`} rate rows={conversionRows.map((r) => ({ key: r.key, label: r.label, values: [pathwayRates(r[group]).conversion] }))} series={[{ label: 'Vaccinated ÷ identified', color: groupColor }]} onPick={pick} />
        </BriefPanel>
        <BriefPathway label="ZDC" counts={T.zdc} color={BRIEF_BLUE} />
        <BriefPathway label="UIC" counts={T.uic} color={BRIEF_GREEN} />
        <BriefPanel title={`Settlement coverage by ${unit}`}>
          <BriefBars label="Settlement coverage" rows={s.rows.map((r) => ({ key: r.key, label: r.label, values: [r.settlements] }))} series={[{ label: 'Settlements covered', color: BRIEF_GREEN }]} onPick={pick} />
        </BriefPanel>
      </div>

      <Card
        className="mt-4"
        title={`${unit} performance summary`}
        hint={`Every ${unitLower} in ${name} · click a column to sort${level !== 'settlement' ? ', a row to drill in' : ''}`}
      >
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Scroll line-list scorecard">
          <table aria-label={`${unit} line-list scorecard`} className="scorecard-table w-full min-w-[1300px] border-separate border-spacing-[3px] text-[12.5px]">
            <thead className="text-[11px] text-[#667085]">
              <tr>
                <Th k="name" left>
                  {unit}
                </Th>
                {showState && <th className="px-2 text-left font-semibold">State</th>}
                <Th k="settlements">Settlements</Th>
                <Th k="zid">ZDC identified</Th>
                <Th k="zref">ZDC referred</Th>
                <Th k="zvac">ZDC vaccinated</Th>
                <Th k="zconv">ZDC conversion</Th>
                <Th k="zrc">ZDC referral completion</Th>
                <Th k="uid">UIC identified</Th>
                <Th k="uref">UIC referred</Th>
                <Th k="uvac">UIC vaccinated</Th>
                <Th k="uconv">UIC conversion</Th>
                <Th k="urc">UIC referral completion</Th>
                <Th k="wait">Waiting</Th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => {
                const patch = drill(r.key);
                const z = pathwayRates(r.zdc);
                const u = pathwayRates(r.uic);
                return (
                  <tr key={r.key} onClick={() => patch && set(patch)} className={cn(patch && 'cursor-pointer [&>td:first-child]:hover:text-[#597DC2]')}>
                    <td className="px-2 py-1.5 font-semibold">{r.label}</td>
                    {showState && <td className="px-2 text-[#667085]">{getState(r.stateId)?.name}</td>}
                    {numCell(r.settlements)}
                    {numCell(r.zdc.identified)}
                    {numCell(r.zdc.referred)}
                    {numCell(r.zdc.vaccinated)}
                    {pctCell(z.conversion)}
                    {pctCell(z.referralCompletion)}
                    {numCell(r.uic.identified)}
                    {numCell(r.uic.referred)}
                    {numCell(r.uic.vaccinated)}
                    {pctCell(u.conversion)}
                    {pctCell(u.referralCompletion)}
                    <td className={cn(CELL, 'bg-[#FDECEC] text-[#B4232A]')}>{fmtInt(waiting(r))}</td>
                  </tr>
                );
              })}
              <tr className="text-[13px]">
                <td className="border-t-2 border-[#204F3F] px-2 py-2 font-extrabold">{level === 'lga' ? 'All LGAs' : 'Total'}</td>
                {showState && <td className="border-t-2 border-[#204F3F]" />}
                <td className={TOTAL_CELL}>{fmtInt(T.settlements)}</td>
                <td className={TOTAL_CELL}>{fmtInt(T.zdc.identified)}</td>
                <td className={TOTAL_CELL}>{fmtInt(T.zdc.referred)}</td>
                <td className={TOTAL_CELL}>{fmtInt(T.zdc.vaccinated)}</td>
                <td className={TOTAL_CELL}>{fmtPct(pathwayRates(T.zdc).conversion)}</td>
                <td className={TOTAL_CELL}>{fmtPct(pathwayRates(T.zdc).referralCompletion)}</td>
                <td className={TOTAL_CELL}>{fmtInt(T.uic.identified)}</td>
                <td className={TOTAL_CELL}>{fmtInt(T.uic.referred)}</td>
                <td className={TOTAL_CELL}>{fmtInt(T.uic.vaccinated)}</td>
                <td className={TOTAL_CELL}>{fmtPct(pathwayRates(T.uic).conversion)}</td>
                <td className={TOTAL_CELL}>{fmtPct(pathwayRates(T.uic).referralCompletion)}</td>
                <td className={cn(TOTAL_CELL, 'text-[#B4232A]')}>{fmtInt(waiting(T))}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <RagLegend />
      </Card>

      <Card id="data-quality" className="mt-4" title="Data quality" hint={`Checks on the ${SOURCE}`}>
        <ul className="flex flex-col gap-2 text-[13px] text-[#344054]">
          <Check ok={postRefOk}>Children vaccinated after referral never exceed children referred.</Check>
          <Check ok>{plural(ds.duplicateRowsMerged, 'duplicate row')} merged so each child is counted once.</Check>
          <Check ok={unresolved.length === 0}>
            {unresolved.length === 0
              ? 'Every record matched a known LGA.'
              : `${plural(unresolved.length, 'record')} with an unknown LGA (“${[...new Set(unresolved.map((u) => u.lga))].join('”, “')}”) are excluded.`}
          </Check>
        </ul>
      </Card>
    </Shell>
  );
}
