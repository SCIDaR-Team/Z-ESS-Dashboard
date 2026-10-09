import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Hourglass, MapPin, Syringe, UsersRound } from 'lucide-react';
import type { Dataset } from '@/data/normalise';
import { periodRangeLabel } from '@/data/period';
import { pathwayRates, type LineListRow, type PathwayCounts } from '@/data/calc/lineList';
import { getState } from '@/data/reference/geography';
import { fmtInt, fmtPct } from '@/lib/format';
import { cn } from '@/lib/cn';
import { fromOption, lgaOptions, settlementOptions, stateOptions, toOption, wardOptions, plural } from './filters';
import { areaName, crumbs, delta, LEVEL_LABEL, levelPlural, rag, useLineList, waiting } from './common';
import { Check, FilterSelect, PeriodChip, PeriodFilter, Shell } from './ui';
import { Card, Chip, Crumbs, KpiCard, RagLegend, Seg } from './kit';
import { CELL, NUM_CELL, PALETTE, RAG_CELL, TOTAL_CELL } from './theme';

const SOURCE = 'Optimus line list';

type SortKey = 'name' | 'settlements' | 'zid' | 'zconv' | 'zrc' | 'uid' | 'uconv' | 'urc' | 'wait';

const found = (t: LineListRow) => t.zdc.identified + t.uic.identified;
const vaccinated = (t: LineListRow) => t.zdc.vaccinated + t.uic.vaccinated;

export function LineListPage({ ds }: { ds: Dataset }) {
  const { f, set, periodKey, period, s, level, drill, prev, prevPeriod, trend } = useLineList(ds);
  const [actGroup, setActGroup] = useState<'all' | 'zdc' | 'uic'>('all');
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'wait', dir: -1 });

  const T = s.total;
  const name = areaName(ds, f);
  const unit = LEVEL_LABEL[level];
  const showState = level === 'lga' && !f.stateId;
  const cmp = prevPeriod?.label ?? null;
  const spark = (pick: (t: LineListRow) => number | null) => ({
    values: trend.map((m) => pick(m.total)),
    partialLast: trend[trend.length - 1]?.partial ?? false,
  });
  const reached = s.rows.filter((r) => r.settlements > 0).length;
  // "Programme to date" has nothing before it; say what the trend line shows instead.
  const fallback = `Monthly trend since ${trend[0]?.label ?? ''}`;

  const waitOf = (r: LineListRow) =>
    actGroup === 'zdc' ? pathwayRates(r.zdc).notVaccinated : actGroup === 'uic' ? pathwayRates(r.uic).notVaccinated : waiting(r);
  const convOf = (r: LineListRow) =>
    actGroup === 'zdc'
      ? pathwayRates(r.zdc).conversion
      : actGroup === 'uic'
        ? pathwayRates(r.uic).conversion
        : found(r) === 0
          ? null
          : (vaccinated(r) / found(r)) * 100;
  const act = [...s.rows].filter((r) => found(r) > 0).sort((a, b) => waitOf(b) - waitOf(a)).slice(0, 7);
  const maxWait = Math.max(1, ...act.map(waitOf));

  const sortVal = (r: LineListRow, k: SortKey): number | string => {
    const z = pathwayRates(r.zdc);
    const u = pathwayRates(r.uic);
    return {
      name: r.label,
      settlements: r.settlements,
      zid: r.zdc.identified,
      zconv: z.conversion ?? -1,
      zrc: z.referralCompletion ?? -1,
      uid: r.uic.identified,
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
      meta={ds.meta}
      filters={filters}
      period={<PeriodChip value={periodKey} onChange={(k) => set({ period: k })} meta={ds.meta} />}
      activeFilters={[f.stateId, f.lgaId, f.wardId, f.settlementId, f.period && f.period !== 'to-date' ? f.period : null].filter(Boolean).length}
      onResetFilters={() => set({ stateId: null, lgaId: null, wardId: null, settlementId: null, period: null })}
    >
      <Crumbs items={crumbs(ds, f)} onPick={(c) => c.patch && set(c.patch)} />
      <h2 className="mt-1.5 text-[22px] font-bold tracking-[-0.01em]">Where do we stand in {name}?</h2>
      <p className="mt-0.5 text-[13.5px] text-[#667085]">
        {period.label}: children identified {periodRangeLabel(period)}, with referrals and verified vaccinations counted to the cut-off.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Children found"
          value={fmtInt(found(T))}
          icon={UsersRound}
          tone="zdc"
          delta={delta(found(T), prev && found(prev), 'count')}
          compareLabel={cmp}
          fallback={fallback}
          spark={spark(found)}
          sub={`${fmtInt(T.zdc.identified)} zero-dose · ${fmtInt(T.uic.identified)} under-immunised`}
        />
        <KpiCard
          label="Children vaccinated"
          value={fmtInt(vaccinated(T))}
          icon={Syringe}
          tone="green"
          delta={delta(vaccinated(T), prev && vaccinated(prev), 'count')}
          compareLabel={cmp}
          fallback={fallback}
          spark={spark(vaccinated)}
          sub={`${fmtPct(found(T) ? (vaccinated(T) / found(T)) * 100 : null)} of children found`}
        />
        <KpiCard
          label="Still waiting"
          value={fmtInt(waiting(T))}
          icon={Hourglass}
          tone="red"
          featured
          delta={delta(waiting(T), prev && waiting(prev), 'count', false)}
          compareLabel={cmp}
          fallback={fallback}
          spark={spark(waiting)}
          sub={`${fmtInt(pathwayRates(T.zdc).referredPending + pathwayRates(T.uic).referredPending)} referred and not yet vaccinated`}
        />
        <KpiCard
          label="Settlements reached"
          value={fmtInt(T.settlements)}
          icon={MapPin}
          tone="navy"
          delta={delta(T.settlements, prev?.settlements, 'count')}
          compareLabel={cmp}
          fallback={fallback}
          spark={spark((t) => t.settlements)}
          sub={`Across ${reached} ${reached === 1 ? (level === 'lga' ? 'LGA' : unit.toLowerCase()) : levelPlural(level)}`}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card className="flex flex-col" title="Child journey" hint="Children at each step · the number lost between steps in red">
          <div className="flex flex-1 flex-col gap-5">
            <Journey label="Zero-dose (ZDC)" counts={T.zdc} color={PALETTE.zdc} light={PALETTE.zdcLight} />
            <Journey label="Under-immunised (UIC)" counts={T.uic} color={PALETTE.uic} light={PALETTE.uicLight} />
          </div>
        </Card>
        <Card
          title="Where to act first"
          hint={`${levelPlural(level)[0].toUpperCase()}${levelPlural(level).slice(1)} with the most children still waiting · click to drill in`}
          action={
            <Seg
              label="Children"
              value={actGroup}
              onChange={setActGroup}
              options={[
                { value: 'all', label: 'All' },
                { value: 'zdc', label: 'ZDC' },
                { value: 'uic', label: 'UIC' },
              ]}
            />
          }
        >
          {act.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-[#667085]">No children identified here in this period.</p>
          ) : (
            <ol className="flex flex-col">
              {act.map((r, i) => {
                const patch = drill(r.key);
                const c = convOf(r);
                return (
                  <li key={r.key} className="border-t border-[#E4E9DF] first:border-t-0">
                    <button
                      type="button"
                      disabled={!patch}
                      onClick={() => patch && set(patch)}
                      className="grid w-full grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-lg px-1 py-2 text-left enabled:hover:bg-[#F9FAFB]"
                    >
                      <span className="grid h-[22px] w-[22px] place-items-center rounded-md bg-[#F2F4F7] text-[11px] font-bold text-[#657264]">{i + 1}</span>
                      <span className="min-w-0">
                        <span className="block truncate text-[14px] font-semibold">{r.label}</span>
                        <span className="mt-1 flex items-center gap-2 text-[12px] text-[#667085]">
                          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#F2F4F7]">
                            <span className="block h-full rounded-full bg-[#E5484D]" style={{ width: `${(waitOf(r) / maxWait) * 100}%` }} />
                          </span>
                          <span className="whitespace-nowrap tabular">{fmtInt(waitOf(r))} waiting</span>
                        </span>
                      </span>
                      <Chip rag={rag(c)}>{fmtPct(c, 0)} converted</Chip>
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
        </Card>
      </div>

      <Card
        className="mt-4"
        title={`${unit} scorecard`}
        hint={`Every ${unitLower} in ${name} · click a column to sort${level !== 'settlement' ? ', a row to drill in' : ''}`}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-separate border-spacing-[3px] text-[12.5px]">
            <thead className="text-[11px] text-[#667085]">
              <tr>
                <Th k="name" left>
                  {unit}
                </Th>
                {showState && <th className="px-2 text-left font-semibold">State</th>}
                <Th k="settlements">Settlements</Th>
                <Th k="zid">ZDC found</Th>
                <Th k="zconv">ZDC conversion</Th>
                <Th k="zrc">ZDC referral completion</Th>
                <Th k="uid">UIC found</Th>
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
                    {pctCell(z.conversion)}
                    {pctCell(z.referralCompletion)}
                    {numCell(r.uic.identified)}
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
                <td className={TOTAL_CELL}>{fmtPct(pathwayRates(T.zdc).conversion)}</td>
                <td className={TOTAL_CELL}>{fmtPct(pathwayRates(T.zdc).referralCompletion)}</td>
                <td className={TOTAL_CELL}>{fmtInt(T.uic.identified)}</td>
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

function Journey({ label, counts, color, light }: { label: string; counts: PathwayCounts; color: string; light: string }) {
  const r = pathwayRates(counts);
  const w = (n: number) => (counts.identified ? Math.max(12, (n / counts.identified) * 100) : 100);
  const step = (n: number, t: string, bg: string, fg: string) => (
    <div className="flex min-h-[42px] flex-col justify-center rounded-lg px-3 text-[11.5px]" style={{ width: `${w(n)}%`, background: bg, color: fg }}>
      <b className="text-[16px] tabular">{fmtInt(n)}</b>
      {t}
    </div>
  );
  const drop = (n: number) => (n > 0 ? <span className="self-center whitespace-nowrap px-2.5 text-[11.5px] font-semibold text-[#E5484D]">−{fmtInt(n)}</span> : null);
  return (
    <div className="grid flex-1 grid-cols-[100px_minmax(0,1fr)] gap-3 sm:grid-cols-[124px_minmax(0,1fr)]">
      <div className="self-center">
        <p className="text-[13px] font-bold">{label}</p>
        <div className="mt-1.5 flex flex-col items-start gap-1">
          <Chip rag={rag(r.conversion)}>{fmtPct(r.conversion)} converted</Chip>
          <Chip rag={rag(r.referralCompletion)}>{fmtPct(r.referralCompletion)} of referred</Chip>
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex flex-1">
          {step(counts.identified, 'Identified', light, color)}
        </div>
        <div className="flex flex-1">
          {step(counts.referred, 'Referred', `${color}B3`, '#fff')}
          {drop(counts.identified - counts.referred)}
        </div>
        <div className="flex flex-1">
          {step(counts.vaccinated, 'Vaccinated', color, '#fff')}
          {drop(counts.referred - counts.vaccinated)}
        </div>
      </div>
    </div>
  );
}
