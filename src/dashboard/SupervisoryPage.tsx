import { Fragment, useState } from 'react';
import { Syringe, Target, UserRoundCheck } from 'lucide-react';
import type { Dataset } from '@/data/normalise';
import { dateLabel, monthLabel, periodRangeLabel } from '@/data/period';
import { supervisoryRates } from '@/data/calc/supervisory';
import type { Progress } from '@/data/calc/targets';
import { getLga } from '@/data/reference/geography';
import { ANTIGENS, OTHER_ANTIGENS } from '@/data/types';
import { fmtInt, fmtPct } from '@/lib/format';
import { cn } from '@/lib/cn';
import { fromOption, lgaOptions, stateOptions, toOption, plural } from './filters';
import { areaName, crumbs, delta, geoOnly, LEVEL_LABEL, rag, useSupervisoryData, type Rag } from './common';
import { Check, FilterSelect, PeriodChip, PeriodFilter, Shell } from './ui';
import { Card, Chip, ComparisonBar, Crumbs, KpiCard, RagLegend, Seg } from './kit';
import { CELL, NUM_CELL, PALETTE, RAG_CELL, TOTAL_CELL } from './theme';

const SOURCE = 'Supervisory checklist';

export function SupervisoryPage({ ds }: { ds: Dataset }) {
  const { f, set, periodKey, period, sup, tgt, level, drill, prev, prevPeriod, trend } = useSupervisoryData(ds);
  const [group, setGroup] = useState<'zdc' | 'uic'>('zdc');
  const [showCommunityDetails, setShowCommunityDetails] = useState(false);
  const [doseView, setDoseView] = useState<'table' | 'penta1' | 'penta3'>('table');
  const T = sup.total;
  const R = supervisoryRates(T);
  const name = areaName(ds, f);
  const unit = LEVEL_LABEL[level];
  const cmp = prevPeriod?.label ?? null;
  const partialLast = trend[trend.length - 1]?.partial ?? false;
  const fallback = `Monthly trend since ${trend[0]?.label ?? ''}`;
  const basis = period.partial
    ? `Month to date (${periodRangeLabel(period)}) against the full-month target`
    : period.months.length > 1
      ? `${monthLabel(period.months[0], true)} – ${monthLabel(period.months[period.months.length - 1], true)} against the sum of monthly targets`
      : `${monthLabel(period.months[0])} against the monthly target`;
  // A month in progress would always look "behind" against a full-month target, so it is not rated.
  const achRag = (v: number | null): Rag => (period.partial ? 'none' : rag(v, 90, 70));

  const tRows = [...tgt.rows].sort((a, b) => (a[group].achievement ?? 0) - (b[group].achievement ?? 0));
  const maxAch = Math.max(100, ...tRows.map((r) => r[group].achievement ?? 0));
  const tgtByKey = new Map(tgt.rows.map((r) => [r.key, r]));
  const unitLower = level === 'lga' ? 'LGA' : unit.toLowerCase();
  const totalLabel = level === 'lga' ? 'All LGAs' : 'Total';
  const silent = (level === 'lga' ? sup.rows : []).filter((r) => r.reports === 0);
  const maxDose = Math.max(1, ...OTHER_ANTIGENS.map((a) => T.doses[a]));
  const showTargets = level === 'lga';
  const comparisonDose = doseView === 'penta3' ? 'Penta3' : 'Penta1';
  const comparisonGroup = doseView === 'penta3' ? 'UIC' : 'ZDC';
  const comparisonLight = doseView === 'penta3' ? '#B7D7CA' : '#C4D1EB';
  const comparisonColor = doseView === 'penta3' ? PALETTE.uic : PALETTE.zdc;
  const linkedDoses = (r: typeof T) => doseView === 'penta3' ? r.penta3ToUic : r.penta1ToZdc;
  const comparisonMax = Math.max(1, ...sup.rows.flatMap((r) => [r.doses[comparisonDose], linkedDoses(r)]));

  const filters = (
    <>
      <PeriodFilter value={periodKey} onChange={(k) => set({ period: k })} meta={ds.meta} />
      <FilterSelect label="State" value={toOption(f.stateId)} options={stateOptions()} onChange={(v) => set({ stateId: fromOption(v) })} />
      <FilterSelect label="LGA" value={toOption(f.lgaId)} options={lgaOptions(f.stateId)} onChange={(v) => set({ lgaId: fromOption(v) })} />
    </>
  );

  const targetKpi = (k: 'zdc' | 'uic') => {
    const p: Progress = tgt.total[k];
    return (
      <KpiCard
        label={k === 'zdc' ? 'Zero-dose target reached' : 'Under-immunised target reached'}
        value={fmtPct(p.achievement)}
        icon={Target}
        tone={k === 'zdc' ? 'zdc' : 'uic'}
        featured={k === 'zdc'}
        delta={delta(p.achievement, prev?.tgt[k].achievement, 'rate')}
        compareLabel={cmp}
        fallback={fallback}
        spark={{ values: trend.map((m) => m.tgt[k].achievement), partialLast }}
        sub={`${fmtInt(p.achieved)} of ${fmtInt(p.target)} · ${p.remaining === 0 ? 'target met' : `${fmtInt(p.remaining)} to go`}`}
      />
    );
  };

  return (
    <Shell
      page={{
        title: 'Supervisory checklist dashboard',
        subtitle: 'Implementation data from supervisory checklists, with monthly ZDC and UIC target progress',
        source: SOURCE,
      }}
      meta={ds.meta}
      filters={filters}
      period={<PeriodChip value={periodKey} onChange={(k) => set({ period: k })} meta={ds.meta} />}
      activeFilters={[f.stateId, f.lgaId, f.period && f.period !== 'this-month' ? f.period : null].filter(Boolean).length}
      onResetFilters={() => set({ stateId: null, lgaId: null, period: null })}
    >
      <Crumbs items={crumbs(ds, f)} onPick={(c) => c.patch && set(geoOnly(c.patch))} />
      <h2 className="mt-1.5 text-[22px] font-bold tracking-[-0.01em]">Are we on target in {name}?</h2>
      <p className="mt-0.5 text-[13.5px] text-[#667085]">
        {period.label}: {fmtInt(T.reports)} checklist reports from {periodRangeLabel(period)}.
        {period.partial && ' Targets are full-month and not prorated.'}
      </p>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {targetKpi('zdc')}
        {targetKpi('uic')}
        <KpiCard
          label="Penta1 given to zero-dose"
          value={fmtInt(T.penta1ToZdc)}
          icon={Syringe}
          tone="zdc"
          delta={delta(T.penta1ToZdc, prev?.sup.penta1ToZdc, 'count')}
          compareLabel={cmp}
          fallback={fallback}
          spark={{ values: trend.map((m) => m.sup.penta1ToZdc), partialLast }}
          sub={`${fmtPct(R.penta1ZdcShare)} of ${fmtInt(T.doses.Penta1)} Penta1 doses`}
        />
        <KpiCard
          label="Penta3 given to under-immunised"
          value={fmtInt(T.penta3ToUic)}
          icon={UserRoundCheck}
          tone="uic"
          delta={delta(T.penta3ToUic, prev?.sup.penta3ToUic, 'count')}
          compareLabel={cmp}
          fallback={fallback}
          spark={{ values: trend.map((m) => m.sup.penta3ToUic), partialLast }}
          sub={`${fmtPct(R.penta3UicShare)} of ${fmtInt(T.doses.Penta3)} Penta3 doses`}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card
          title="Target progress by LGA"
          hint={`Lowest first · ${basis.charAt(0).toLowerCase()}${basis.slice(1)} · click to drill in`}
          action={
            <Seg
              label="Group"
              value={group}
              onChange={setGroup}
              options={[
                { value: 'zdc', label: 'ZDC' },
                { value: 'uic', label: 'UIC' },
              ]}
            />
          }
        >
          <ul className="flex flex-col gap-1">
            {tRows.map((r) => {
              const p = r[group];
              const patch = level === 'lga' ? drill(r.key) : null;
              return (
                <li key={r.key}>
                  <button
                    type="button"
                    disabled={!patch}
                    onClick={() => patch && set(patch)}
                    className="grid w-full grid-cols-[88px_minmax(0,1fr)_auto] items-center gap-3 rounded-md px-1 py-1 text-left text-[13px] enabled:hover:bg-[#F9FAFB] sm:grid-cols-[120px_minmax(0,1fr)_150px]"
                  >
                    <span className="truncate font-semibold">{r.label}</span>
                    <span className="relative h-3 rounded-full bg-[#EEF1F6]">
                      <span
                        className="absolute inset-y-0 left-0 rounded-full"
                        style={{ width: `${((p.achievement ?? 0) / maxAch) * 100}%`, background: group === 'zdc' ? PALETTE.zdc : PALETTE.uic }}
                      />
                      <span className="absolute inset-y-[-3px] w-0.5 bg-[#204F3F]" style={{ left: `${(100 / maxAch) * 100}%` }} title="Target" />
                    </span>
                    <span className="flex items-center justify-end gap-2 text-[12px] text-[#667085] tabular">
                      {fmtInt(p.achieved)}/{fmtInt(p.target)}
                      <Chip rag={achRag(p.achievement)}>{fmtPct(p.achievement, 0)}</Chip>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-[11.5px] text-[#667085]">The dark tick marks 100% of target. Bars can pass it — achievement is never capped.</p>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="shrink-0" title="Community engagement" hint="Cases identified in the period">
            <Funnel
              title="Non-compliant households"
              steps={[
                ['Identified', T.households.identified],
                ['Followed up', T.households.followedUp],
                ['Converted', T.households.converted],
              ]}
              rateLabel="converted of followed up"
              rate={R.householdConversion}
            />
            <div className="h-4" />
            <Funnel
              title="RI rumours"
              steps={[
                ['Identified', T.rumours.identified],
                ['Addressed', T.rumours.addressed],
              ]}
              rateLabel="resolved"
              rate={R.rumourResolution}
            />
          </Card>
          <Card className="flex flex-1 flex-col" title="Other antigens" hint={`Doses · ${periodRangeLabel(period)}`}>
            <ul className="flex flex-1 flex-col justify-between gap-1.5 text-[12.5px]">
              {OTHER_ANTIGENS.map((a) => (
                <li key={a} className="grid grid-cols-[56px_minmax(0,1fr)_56px] items-center gap-2">
                  <span className="font-semibold">{a}</span>
                  <span className="h-2 rounded-full bg-[#EEF1F6]">
                    <span className="block h-full rounded-full bg-[#204F3F]" style={{ width: `${(T.doses[a] / maxDose) * 100}%` }} />
                  </span>
                  <span className="text-right tabular">{fmtInt(T.doses[a])}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <Card
        className="mt-4"
        title={`${unit} scorecard`}
        hint={`Every ${unitLower} in ${name}${showTargets ? ' · targets and remaining children are counts · click a row to drill in' : ''}`}
        action={<button type="button" aria-expanded={showCommunityDetails} aria-controls="supervisory-scorecard" onClick={() => setShowCommunityDetails((v) => !v)} className="rounded-lg border border-[#E4E9DF] px-3 py-1.5 text-[12px] font-semibold hover:bg-[#F4F7F1]">{showCommunityDetails ? 'Hide community counts' : 'Show community counts'}</button>}
      >
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Scroll supervisory scorecard">
          <table id="supervisory-scorecard" aria-label={`${unit} supervisory scorecard`} className={cn('scorecard-table w-full border-separate border-spacing-[3px] text-[12.5px]', showCommunityDetails ? 'min-w-[1900px]' : 'min-w-[1300px]')}>
            <thead className="text-[11px] text-[#667085]">
              <tr>
                {[
                  unit, 'Reports', 'Settlements', 'ZDC found',
                  ...(showTargets ? ['ZDC target', 'ZDC achievement %', 'ZDC remaining'] : []),
                  'UIC found', ...(showTargets ? ['UIC target', 'UIC achievement %', 'UIC remaining'] : []),
                  'Penta1 ZDC share %', 'Penta3 UIC share %',
                  ...(showCommunityDetails ? ['Households identified', 'Households followed up', 'Households converted'] : []),
                  'Household conversion %',
                  ...(showCommunityDetails ? ['Rumours identified', 'Rumours addressed'] : []),
                  'Rumour resolution %',
                ].map((h, i) => (
                  <th key={h} scope="col" className={cn('px-2 py-1.5 font-semibold', i === 0 ? 'text-left' : 'text-center')}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sup.rows.map((r) => {
                const t = tgtByKey.get(r.key);
                const rr = supervisoryRates(r);
                const patch = drill(r.key);
                const num = (v: number | null | undefined) => <td className={NUM_CELL}>{fmtInt(v)}</td>;
                const cell = (v: number | null, rg: Rag) => <td className={cn(CELL, RAG_CELL[rg])}>{fmtPct(v)}</td>;
                return (
                  <tr key={r.key} onClick={() => patch && set(patch)} className={cn(patch && 'cursor-pointer [&>td:first-child]:hover:text-[#597DC2]')}>
                    <td className="px-2 py-1.5 font-semibold">{r.label}</td>
                    {r.reports === 0 ? <td className={cn(CELL, 'bg-[#FDECEC] text-[#B4232A]')}>None</td> : num(r.reports)}
                    {num(r.settlements)}
                    {num(r.zdcIdentified)}
                    {showTargets && <>{num(t?.zdc.target)}{cell(t?.zdc.achievement ?? null, achRag(t?.zdc.achievement ?? null))}{num(t?.zdc.remaining)}</>}
                    {num(r.uicIdentified)}
                    {showTargets && <>{num(t?.uic.target)}{cell(t?.uic.achievement ?? null, achRag(t?.uic.achievement ?? null))}{num(t?.uic.remaining)}</>}
                    {cell(rr.penta1ZdcShare, 'none')}
                    {cell(rr.penta3UicShare, 'none')}
                    {showCommunityDetails && <>{num(r.households.identified)}{num(r.households.followedUp)}{num(r.households.converted)}</>}
                    {cell(rr.householdConversion, rag(rr.householdConversion))}
                    {showCommunityDetails && <>{num(r.rumours.identified)}{num(r.rumours.addressed)}</>}
                    {cell(rr.rumourResolution, rag(rr.rumourResolution))}
                  </tr>
                );
              })}
              <tr className="text-[13px]">
                <td className="border-t-2 border-[#204F3F] px-2 py-2 font-extrabold">{totalLabel}</td>
                <td className={TOTAL_CELL}>{fmtInt(T.reports)}</td>
                <td className={TOTAL_CELL}>{fmtInt(T.settlements)}</td>
                <td className={TOTAL_CELL}>{fmtInt(T.zdcIdentified)}</td>
                {showTargets && <><td className={TOTAL_CELL}>{fmtInt(tgt.total.zdc.target)}</td><td className={TOTAL_CELL}>{fmtPct(tgt.total.zdc.achievement)}</td><td className={TOTAL_CELL}>{fmtInt(tgt.total.zdc.remaining)}</td></>}
                <td className={TOTAL_CELL}>{fmtInt(T.uicIdentified)}</td>
                {showTargets && <><td className={TOTAL_CELL}>{fmtInt(tgt.total.uic.target)}</td><td className={TOTAL_CELL}>{fmtPct(tgt.total.uic.achievement)}</td><td className={TOTAL_CELL}>{fmtInt(tgt.total.uic.remaining)}</td></>}
                <td className={TOTAL_CELL}>{fmtPct(R.penta1ZdcShare)}</td>
                <td className={TOTAL_CELL}>{fmtPct(R.penta3UicShare)}</td>
                {showCommunityDetails && <><td className={TOTAL_CELL}>{fmtInt(T.households.identified)}</td><td className={TOTAL_CELL}>{fmtInt(T.households.followedUp)}</td><td className={TOTAL_CELL}>{fmtInt(T.households.converted)}</td></>}
                <td className={TOTAL_CELL}>{fmtPct(R.householdConversion)}</td>
                {showCommunityDetails && <><td className={TOTAL_CELL}>{fmtInt(T.rumours.identified)}</td><td className={TOTAL_CELL}>{fmtInt(T.rumours.addressed)}</td></>}
                <td className={TOTAL_CELL}>{fmtPct(R.rumourResolution)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <RagLegend
          note={
            period.partial
              ? 'Target achievement is month to date, so it is not colour-rated.'
              : 'Targets: on track ≥ 90%, watch 70–90%, behind < 70%.'
          }
        />
      </Card>

      <Card
        className="mt-4"
        title={`Vaccine doses by ${unitLower}`}
        hint={`Doses given, ${periodRangeLabel(period)} · Penta1 and Penta3 shown with the doses given to identified ZDC and UIC`}
        action={<Seg label="Vaccine view" value={doseView} onChange={setDoseView} options={[{ value: 'table', label: 'Table' }, { value: 'penta1', label: 'Penta1' }, { value: 'penta3', label: 'Penta3' }]} />}
      >
        {doseView !== 'table' ? <>
          <div className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-[#657264]">
            <span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm" style={{ background: comparisonLight }} />All {comparisonDose} doses</span>
            <span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm" style={{ background: comparisonColor }} />{comparisonDose} doses to {comparisonGroup}</span>
          </div>
          <ul className="max-h-[460px] overflow-y-auto" aria-label={`${comparisonDose} dose comparison`}>
            {sup.rows.map((r) => {
              const patch = drill(r.key);
              const subset = linkedDoses(r);
              return <li key={r.key} className="border-t border-[#E4E9DF] first:border-t-0">
                <button type="button" disabled={!patch} onClick={() => patch && set(patch)} className="grid w-full grid-cols-[88px_minmax(0,1fr)] items-center gap-3 rounded-lg px-1 py-3 text-left enabled:hover:bg-[#F9FAFB] sm:grid-cols-[140px_minmax(0,1fr)]">
                  <span className="truncate text-[13px] font-semibold">{r.label}</span>
                  <span className="flex flex-col gap-2">
                    <ComparisonBar label={`All ${comparisonDose} doses`} value={r.doses[comparisonDose]} max={comparisonMax} color={comparisonLight} />
                    <ComparisonBar label={`${comparisonDose} doses to ${comparisonGroup}`} value={subset} max={comparisonMax} color={comparisonColor} flagged={subset > r.doses[comparisonDose]} />
                  </span>
                </button>
              </li>;
            })}
          </ul>
          <p className="mt-3 text-[11px] text-[#667085]">All {sup.rows.length} {level === 'lga' ? 'LGAs' : 'settlements'} · scroll to compare · {periodRangeLabel(period)} · {SOURCE}</p>
        </> : <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] border-separate border-spacing-[3px] text-[12.5px]">
            <thead className="text-[11px] text-[#667085]">
              <tr>
                <th scope="col" className="px-2 py-1.5 text-left font-semibold">
                  {unit}
                </th>
                {ANTIGENS.flatMap((a) =>
                  a === 'Penta1'
                    ? ['Penta1', 'Penta1 to ZDC']
                    : a === 'Penta3'
                      ? ['Penta3', 'Penta3 to UIC']
                      : [a]
                ).map((h) => (
                  <th key={h} scope="col" className="px-2 py-1.5 text-center font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sup.rows.map((r) => {
                const patch = drill(r.key);
                // A subset larger than its total is an entry error: flag it in place.
                const sub = (v: number, total: number) => (
                  <td className={cn(CELL, v > total ? 'bg-[#FDECEC] text-[#B4232A]' : 'bg-[#EEF1FF] text-[#597DC2]')} title={v > total ? 'More than the total doses given — flagged for review' : undefined}>
                    {fmtInt(v)}
                  </td>
                );
                return (
                  <tr key={r.key} onClick={() => patch && set(patch)} className={cn(patch && 'cursor-pointer [&>td:first-child]:hover:text-[#597DC2]')}>
                    <td className="px-2 py-1.5 font-semibold">{r.label}</td>
                    {ANTIGENS.map((a) => (
                      <Fragment key={a}>
                        <td className={NUM_CELL}>{fmtInt(r.doses[a])}</td>
                        {a === 'Penta1' && sub(r.penta1ToZdc, r.doses.Penta1)}
                        {a === 'Penta3' && sub(r.penta3ToUic, r.doses.Penta3)}
                      </Fragment>
                    ))}
                  </tr>
                );
              })}
              <tr className="text-[13px]">
                <td className="border-t-2 border-[#204F3F] px-2 py-2 font-extrabold">{totalLabel}</td>
                {ANTIGENS.flatMap((a) =>
                  a === 'Penta1' ? [T.doses.Penta1, T.penta1ToZdc] : a === 'Penta3' ? [T.doses.Penta3, T.penta3ToUic] : [T.doses[a]]
                ).map((v, i) => (
                  <td key={i} className={TOTAL_CELL}>
                    {fmtInt(v)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>}
      </Card>

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
    </Shell>
  );
}

function Funnel({ title, steps, rate, rateLabel }: { title: string; steps: [string, number][]; rate: number | null; rateLabel: string }) {
  const max = Math.max(1, steps[0][1]);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-[13px] font-bold">{title}</p>
        <Chip rag={rag(rate)}>
          {fmtPct(rate)} {rateLabel}
        </Chip>
      </div>
      <div className="flex flex-col gap-1">
        {steps.map(([label, v], i) => (
          <div key={label} className="grid grid-cols-[84px_minmax(0,1fr)_52px] items-center gap-2 text-[12.5px]">
            <span className="text-[#657264]">{label}</span>
            <span className="h-2.5 rounded-full bg-[#EEF1F6]">
              <span className="block h-full rounded-full" style={{ width: `${(v / max) * 100}%`, background: i === steps.length - 1 ? '#1F9D55' : '#8592A8' }} />
            </span>
            <span className="text-right font-semibold tabular">{fmtInt(v)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
