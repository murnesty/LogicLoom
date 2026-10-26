# Malaysia Stats — Design Spec (v1)

**Date:** 2026-10-26  
**Status:** Approved for implementation (pending final user review of this file)  
**Repo:** LogicLoom  
**Hub path:** `/malaysia-stats/`  
**Live hub:** https://murnesty.github.io/LogicLoom/

## Goal

Add a LogicLoom prototype that charts **Malaysia national population** from OpenDOSM via the public API (no database). Users can filter by **year**, **sex**, and **ethnicity**, and see:

1. **Age distribution** for the selected year / sex / ethnicity  
2. **Total population over time** for the selected sex / ethnicity (`age = overall`)

Ship a usable page first; tabs (births, projections, households) and richer UX come later.

## Non-goals (v1)

- Backend, Railway, Postgres, or CSV→DB ingest  
- Births / deaths / marriage / fertility tabs  
- State / district breakdowns  
- Official or DIY population projections (“predict” tab)  
- Household income and other catalogue categories  
- Accounts, persistence, or offline caching beyond normal browser HTTP cache  
- Parquet / full CSV downloads in the browser  

## Placement in LogicLoom

| Layer | Choice |
|-------|--------|
| Frontend | New Vite React + TypeScript app: `frontend/malaysia-stats/` |
| Backend | None — same pattern as Places (`restaurant-finder`) and Diff Lab |
| Hub | Card on `frontend/index.html` → `./malaysia-stats/` |
| Deploy | Extend `.github/workflows/deploy-frontend.yml` to build + copy into `_site/malaysia-stats/` |
| Docs | This spec; brief README mention when implementing |

## Data source

- **API base:** `https://api.data.gov.my/opendosm` (CORS allows browser callers)  
- **Dataset id:** `population_malaysia`  
- **License:** Creative Commons Attribution 4.0 (CC BY 4.0) — show attribution + link to OpenDOSM on the page  

### Columns (API records)

| Field | Meaning |
|-------|---------|
| `date` | Annual stamp `YYYY-01-01` |
| `sex` | `both` \| `male` \| `female` |
| `age` | `overall` or five-year bands (`0-4` … `85+`) |
| `ethnicity` | `overall` \| `bumi_malay` \| `bumi_other` \| `chinese` \| `indian` \| `other_citizen` \| `other_noncitizen` |
| `population` | Thousands of people (`'000`) |

### Query style

Use documented `value@column` filters and date bounds, e.g.:

```
GET .../opendosm?id=population_malaysia
  &filter=male@sex,chinese@ethnicity
  &date_start=2024-01-01@date
  &date_end=2024-01-01@date
  &limit=50
```

Total population series:

```
GET .../opendosm?id=population_malaysia
  &filter=both@sex,overall@age,overall@ethnicity
  &date_start=1970-01-01@date
  &limit=100
```

Do **not** rely on bare query params like `sex=male` (they are ignored by the API).

### Data caveats (surface in UI when relevant)

- Ethnicity breakdown is incomplete for early years (roughly: none in 1970–1979; coarser in 1980–1990; full labels from 1991).  
- Age band set changes historically (oldest band may be `70+` / `80+` / `85+` depending on era).  
- Values may not sum exactly to totals due to rounding to one decimal place.  
- If a filter combo returns no rows, show an empty state — do not invent data.

## User experience

### Controls (global for the single page)

- **Year** — options come from years present in the total-population series for the current sex/ethnicity; default to the latest of those years.  
- **Sex** — Both / Male / Female (map to API values).  
- **Ethnicity** — Overall + named groups (human-readable labels in the UI).

Changing sex or ethnicity refreshes both charts; changing year refreshes the age chart (trend chart keeps full history for that sex/ethnicity).

### Charts

1. **Age distribution** — horizontal or vertical bars of five-year age groups for the selected year; exclude the `overall` age row.  
2. **Population over time** — line (or simple bar) of `population` where `age = overall` for the selected sex/ethnicity across years.

Chart library: **Recharts** (React-friendly). Keep styling consistent with a simple prototype — not a marketing landing page.

### States

- Loading while fetching  
- Error if the API fails (retry-friendly message)  
- Empty when filters yield no rows  

### Attribution footer

Text along the lines of: data from Department of Statistics Malaysia / OpenDOSM, CC BY 4.0, with a link to the catalogue dataset page.

## Architecture

```
UI (filters + charts)
        │
        ▼
dosmClient (fetch + filter builders)
        │
        ▼
api.data.gov.my/opendosm?id=population_malaysia
```

- Keep API URL construction and response typing in a small module (not inline in chart components).  
- Map API codes → display labels in one place.  
- No shared monorepo package required for v1.

## Testing (v1)

- Unit-test filter URL building / label maps (pure functions).  
- Manual check in `npm run dev`: change year/sex/ethnicity and confirm charts update.  
- Optional: smoke that deploy workflow lists the new app (config review).

## Success criteria

- Hub card opens `/malaysia-stats/`.  
- Page loads population charts from the live OpenDOSM API.  
- Sex and ethnicity filters change the charts.  
- Year filter changes the age distribution.  
- Attribution is visible.  
- GitHub Pages build includes the new app.

## Follow-ups (explicitly later)

- Tabs: births/deaths history; official projections if open data is available  
- State-level population  
- Household income and other catalogue categories  
- Richer interval controls (decade rollups) once more series are in scope  
