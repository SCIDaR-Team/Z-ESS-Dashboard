# Z-ESS Dashboard

Web dashboard for the Z-ESS programme, built to `20261006_Z-ESS_Synterra_Dashboard_Brief.pdf`. Each page has a one-row header (page name, page links, period chip, and the report's key facts — reporting period, data cut-off, last refresh, source — with all of them under the ⓘ button when space is short), a collapsible navy filter panel on the left, and content that answers one question.

- **Home** (`/`) — the landing page. What the programme is, where every child found so far stands (vaccinated / referred and waiting / not yet referred), four findings read live from the data (where children get stuck, where to act first, last complete month's targets, month-on-month finds) — each opens the view behind it with the filters set — the way into each dashboard, and how every figure is counted. The Z logo on the dashboards leads back here.
- **Line list** (`/line-list`) — "Where do we stand?" Headline cards (children found, vaccinated, still waiting, settlements reached); the ZDC and UIC child journey (identified → referred → vaccinated, with drop-offs, conversion and referral completion); where to act first; a sortable scorecard. Filters: period, state, LGA, ward, settlement. Default period: programme to date.
- **Supervisory checklist** (`/supervisory`) — "Are we on target?" Headline cards (ZDC/UIC target reached, Penta1 to ZDC, Penta3 to UIC); target progress by LGA (lowest first); community engagement; other antigens; a scorecard; and vaccine doses by LGA (every antigen, with Penta1/Penta3 shown beside the doses given to ZDC/UIC). Filters: period, state, LGA. Default period: this month.

The **Period** filter offers This month, Last month, Last 3 months (complete months), Programme to date, or a custom from–to range of months. The sidebar's collapsed/expanded state is remembered per browser.

Click any LGA in a list or scorecard to drill into its wards and settlements; the breadcrumb at the top steps back out. Scorecard rates are coloured on track (≥ 75%), watch (60–75%) or behind (< 60%). Each page ends with its data-quality checks.

Design: a warm white workspace with forest-green accents, a persistent left navigation, and Plus Jakarta Sans. The overview puts vaccination progress, headline counts, the child journey and follow-up priorities first, with direct links into both dashboards. Reports share the same navigation, a collapsible filter panel, and restrained cards. Blue identifies ZDC and teal identifies UIC; status colours retain their meaning. On mobile, navigation and filters move into a drawer. Each headline report card keeps its previous-period comparison and monthly sparkline.

Stack: Vite + React 18 + TypeScript + Tailwind + zustand, tested with vitest — the same as the NPHCDA and ERA dashboards.

```bash
npm install
npm run dev        # http://localhost:5180
npm test           # calc engine + acceptance checks
npm run typecheck && npm run lint && npm run build
```

## Data

`VITE_DATA_SOURCE` picks the source (see `.env.example`):

- `mock` (default) — seeded demonstration data generated in the browser (`src/data/mock/generate.ts`). The header shows a "Demo data" badge.
- `api` — `src/data/datasource/ApiDataSource.ts` reads from `VITE_API_BASE_URL`. The endpoint paths are placeholders until the Optimus and checklist APIs are confirmed; each must return the shapes in `src/data/types.ts`.

Whatever the source, `src/data/normalise.ts` resolves state/LGA aliases (KMC, D/Kudu, Ungoggo, Nassarawa…) and links line-list rows to one record per child ID before anything is counted. Records whose LGA can't be matched are excluded and listed under **Data checks**.

## Definitions and rules

| Term | Rule |
|---|---|
| ZDC | 12–23 months, no Penta-1 |
| UIC | 12–23 months, Penta-1 but no Penta-3 (mutually exclusive with ZDC) |
| Vaccinated | Verified gap-closing dose (Penta1 for ZDC, Penta3 for UIC) on/after identification, by the cut-off |
| Conversion % | Vaccinated ÷ identified (ZDC and UIC each over their own identified) |
| Referral completion % | Referred children vaccinated on/after referral ÷ referred — ZDC and UIC shown separately |
| Cohort and cut-off | Children identified in the period; milestones counted up to the period end or the data cut-off, whichever is earlier |
| Target achievement % | Distinct children identified ÷ the LGA's monthly target (summed over complete months for multi-month). Not prorated, not capped |
| Remaining target | max(target − identified, 0) |

Rates are always calculated from summed counts, never averaged across rows.

## Geography

`src/data/reference/geography.ts` holds the state → LGA list. **Kano** has the brief's 13 LGAs and targets. **Jigawa** is a demonstration state (real LGA names, placeholder targets in `src/data/reference/targets.ts`) so the State filter can be exercised; replace or remove it once the programme states are confirmed.

With **All states** selected, LGA tables group rows by state with a subtotal per state. Choosing an LGA drills the charts and tables down to wards (line list) or settlements (supervisory).
