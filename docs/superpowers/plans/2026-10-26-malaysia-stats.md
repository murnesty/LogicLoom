# Malaysia Stats Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a browser-only Malaysia Stats Vite app under LogicLoom (`/malaysia-stats/`) that charts national population age distribution and totals from the OpenDOSM API with year, sex, and ethnicity filters.

**Architecture:** Thin React UI → `dosmClient` (URL builders + `fetch`) → `https://api.data.gov.my/opendosm?id=population_malaysia`. Charts via Recharts. No backend.

**Tech Stack:** React 18, TypeScript, Vite 5, Vitest, Recharts; GitHub Pages via existing deploy workflow.

**Spec:** `docs/superpowers/specs/2026-10-26-malaysia-stats-design.md`

## Global Constraints

- Hub path / Vite `base`: `/LogicLoom/malaysia-stats/`
- API base (exact): `https://api.data.gov.my/opendosm`
- Dataset id (exact): `population_malaysia`
- Filter syntax: `value@column` only — never bare `sex=male`
- Date params: `date_start=YYYY-01-01@date` / `date_end=YYYY-01-01@date`
- Population unit: thousands (`'000`) — label charts accordingly
- Attribution: DOSM / OpenDOSM, CC BY 4.0, link to catalogue
- No backend / DB / CSV download in v1
- Empty filter results → empty state; do not invent rows

## File map

```
frontend/malaysia-stats/
  package.json
  package-lock.json          # from npm install
  vite.config.ts
  tsconfig.json
  tsconfig.node.json
  index.html
  src/
    main.tsx
    App.tsx
    App.css
    index.css
    vite-env.d.ts
    types.ts
    labels.ts
    labels.test.ts
    dosmUrl.ts
    dosmUrl.test.ts
    dosmClient.ts
    dosmClient.test.ts
    ageSort.ts
    ageSort.test.ts
    components/
      FilterBar.tsx
      AgeChart.tsx
      TrendChart.tsx
      Attribution.tsx

frontend/index.html                          # hub card
.github/workflows/deploy-frontend.yml        # build malaysia-stats
README.md                                    # projects table + URL + run instructions
```

---

### Task 1: Scaffold `frontend/malaysia-stats`

**Files:**
- Create: `frontend/malaysia-stats/package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/App.css`, `src/index.css`, `src/vite-env.d.ts`
- Modify: none

**Interfaces:**
- Produces: runnable Vite app at `base: '/LogicLoom/malaysia-stats/'` with `npm test` via Vitest

- [ ] **Step 1: Create package.json**

`frontend/malaysia-stats/package.json`:
```json
{
  "name": "malaysia-stats",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "homepage": "/LogicLoom/malaysia-stats",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "recharts": "^2.15.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "vitest": "^4.1.2"
  }
}
```

- [ ] **Step 2: Create Vite / TS config and entry files**

`frontend/malaysia-stats/vite.config.ts`:
```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/LogicLoom/malaysia-stats/',
  test: { environment: 'node' },
})
```

`frontend/malaysia-stats/tsconfig.json` — copy from `frontend/restaurant-finder/tsconfig.json` (same options).

`frontend/malaysia-stats/tsconfig.node.json`:
```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

`frontend/malaysia-stats/index.html`:
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Malaysia Stats — Population</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`frontend/malaysia-stats/src/vite-env.d.ts`:
```ts
/// <reference types="vite/client" />
```

`frontend/malaysia-stats/src/main.tsx`:
```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

`frontend/malaysia-stats/src/index.css`:
```css
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: system-ui, Segoe UI, sans-serif;
  background: #f5f6f8;
  color: #1a1a1a;
}
```

`frontend/malaysia-stats/src/App.css`:
```css
.app {
  max-width: 960px;
  margin: 0 auto;
  padding: 1.5rem;
}
.app h1 { margin: 0 0 0.25rem; font-size: 1.75rem; }
.app .subtitle { margin: 0 0 1.5rem; color: #555; }
```

`frontend/malaysia-stats/src/App.tsx`:
```tsx
import './App.css'

export default function App() {
  return (
    <div className="app">
      <h1>Malaysia Stats</h1>
      <p className="subtitle">National population (OpenDOSM)</p>
    </div>
  )
}
```

- [ ] **Step 3: Install and verify**

Run from `frontend/malaysia-stats`:
```bash
npm install
npm run build
npm test
```
Expected: `npm test` exits 0 with no test files (or vitest “no tests”); `npm run build` succeeds.

- [ ] **Step 4: Commit**

```bash
git add frontend/malaysia-stats
git commit -m "Scaffold malaysia-stats Vite app for OpenDOSM population charts."
```

---

### Task 2: Types, labels, age sort, URL builder (TDD)

**Files:**
- Create: `frontend/malaysia-stats/src/types.ts`, `labels.ts`, `labels.test.ts`, `ageSort.ts`, `ageSort.test.ts`, `dosmUrl.ts`, `dosmUrl.test.ts`

**Interfaces:**
- Produces:
  - `PopulationRow`: `{ date: string; sex: string; age: string; ethnicity: string; population: number }`
  - `SexCode = 'both' | 'male' | 'female'`
  - `EthnicityCode = 'overall' | 'bumi_malay' | 'bumi_other' | 'chinese' | 'indian' | 'other_citizen' | 'other_noncitizen'`
  - `SEX_OPTIONS: { value: SexCode; label: string }[]`
  - `ETHNICITY_OPTIONS: { value: EthnicityCode; label: string }[]`
  - `labelSex(code: string): string`, `labelEthnicity(code: string): string`
  - `compareAgeBands(a: string, b: string): number`
  - `buildPopulationUrl(params: { sex: SexCode; ethnicity: EthnicityCode; age?: string; dateStart?: string; dateEnd?: string; limit?: number }): string`

- [ ] **Step 1: Write failing tests**

`frontend/malaysia-stats/src/labels.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { labelEthnicity, labelSex } from './labels'

describe('labels', () => {
  it('maps sex codes', () => {
    expect(labelSex('both')).toBe('Both')
    expect(labelSex('male')).toBe('Male')
    expect(labelSex('female')).toBe('Female')
  })

  it('maps ethnicity codes', () => {
    expect(labelEthnicity('bumi_malay')).toBe('Bumiputera (Malay)')
    expect(labelEthnicity('chinese')).toBe('Chinese')
    expect(labelEthnicity('overall')).toBe('Overall')
  })
})
```

`frontend/malaysia-stats/src/ageSort.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { compareAgeBands } from './ageSort'

describe('compareAgeBands', () => {
  it('orders five-year bands and plus groups', () => {
    const ages = ['85+', '0-4', '10-14', '5-9', 'overall']
    expect([...ages].sort(compareAgeBands)).toEqual([
      '0-4',
      '5-9',
      '10-14',
      '85+',
      'overall',
    ])
  })
})
```

`frontend/malaysia-stats/src/dosmUrl.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { buildPopulationUrl } from './dosmUrl'

describe('buildPopulationUrl', () => {
  it('builds age slice for one year with value@column filters', () => {
    const url = buildPopulationUrl({
      sex: 'male',
      ethnicity: 'chinese',
      dateStart: '2024-01-01',
      dateEnd: '2024-01-01',
      limit: 50,
    })
    expect(url).toBe(
      'https://api.data.gov.my/opendosm?id=population_malaysia&filter=male@sex,chinese@ethnicity&date_start=2024-01-01@date&date_end=2024-01-01@date&limit=50',
    )
  })

  it('builds total population series with overall age', () => {
    const url = buildPopulationUrl({
      sex: 'both',
      ethnicity: 'overall',
      age: 'overall',
      dateStart: '1970-01-01',
      limit: 100,
    })
    expect(url).toContain('filter=both@sex,overall@age,overall@ethnicity')
    expect(url).toContain('date_start=1970-01-01@date')
    expect(url).not.toContain('date_end=')
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd frontend/malaysia-stats && npm test
```
Expected: FAIL (modules not found / exports missing).

- [ ] **Step 3: Implement types + helpers**

`frontend/malaysia-stats/src/types.ts`:
```ts
export type SexCode = 'both' | 'male' | 'female'

export type EthnicityCode =
  | 'overall'
  | 'bumi_malay'
  | 'bumi_other'
  | 'chinese'
  | 'indian'
  | 'other_citizen'
  | 'other_noncitizen'

export type PopulationRow = {
  date: string
  sex: string
  age: string
  ethnicity: string
  population: number
}
```

`frontend/malaysia-stats/src/labels.ts`:
```ts
import type { EthnicityCode, SexCode } from './types'

export const SEX_OPTIONS: { value: SexCode; label: string }[] = [
  { value: 'both', label: 'Both' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
]

export const ETHNICITY_OPTIONS: { value: EthnicityCode; label: string }[] = [
  { value: 'overall', label: 'Overall' },
  { value: 'bumi_malay', label: 'Bumiputera (Malay)' },
  { value: 'bumi_other', label: 'Bumiputera (other)' },
  { value: 'chinese', label: 'Chinese' },
  { value: 'indian', label: 'Indian' },
  { value: 'other_citizen', label: 'Other citizens' },
  { value: 'other_noncitizen', label: 'Non-citizens' },
]

const SEX_LABEL: Record<SexCode, string> = Object.fromEntries(
  SEX_OPTIONS.map((o) => [o.value, o.label]),
) as Record<SexCode, string>

const ETH_LABEL: Record<EthnicityCode, string> = Object.fromEntries(
  ETHNICITY_OPTIONS.map((o) => [o.value, o.label]),
) as Record<EthnicityCode, string>

export function labelSex(code: string): string {
  return SEX_LABEL[code as SexCode] ?? code
}

export function labelEthnicity(code: string): string {
  return ETH_LABEL[code as EthnicityCode] ?? code
}
```

`frontend/malaysia-stats/src/ageSort.ts`:
```ts
/** Sort age bands ascending; `overall` last. */
export function compareAgeBands(a: string, b: string): number {
  if (a === 'overall' && b === 'overall') return 0
  if (a === 'overall') return 1
  if (b === 'overall') return -1
  const rank = (s: string): number => {
    const plus = s.match(/^(\d+)\+$/)
    if (plus) return Number(plus[1])
    const range = s.match(/^(\d+)-/)
    if (range) return Number(range[1])
    return Number.POSITIVE_INFINITY
  }
  return rank(a) - rank(b)
}
```

`frontend/malaysia-stats/src/dosmUrl.ts`:
```ts
import type { EthnicityCode, SexCode } from './types'

const BASE = 'https://api.data.gov.my/opendosm'

export function buildPopulationUrl(params: {
  sex: SexCode
  ethnicity: EthnicityCode
  age?: string
  dateStart?: string
  dateEnd?: string
  limit?: number
}): string {
  const filterParts = [`${params.sex}@sex`]
  if (params.age) filterParts.push(`${params.age}@age`)
  filterParts.push(`${params.ethnicity}@ethnicity`)

  const q = new URLSearchParams()
  q.set('id', 'population_malaysia')
  q.set('filter', filterParts.join(','))
  if (params.dateStart) q.set('date_start', `${params.dateStart}@date`)
  if (params.dateEnd) q.set('date_end', `${params.dateEnd}@date`)
  q.set('limit', String(params.limit ?? 100))

  // URLSearchParams encodes @ as %40 — API accepts either; keep readable @ for tests/API.
  return `${BASE}?${q.toString().replace(/%40/g, '@')}`
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd frontend/malaysia-stats && npm test
```
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/malaysia-stats/src
git commit -m "Add OpenDOSM URL builders, labels, and age-band sorting."
```

---

### Task 3: `dosmClient` fetch helpers (TDD with mocked fetch)

**Files:**
- Create: `frontend/malaysia-stats/src/dosmClient.ts`, `dosmClient.test.ts`

**Interfaces:**
- Consumes: `buildPopulationUrl`, `PopulationRow`, `SexCode`, `EthnicityCode`, `compareAgeBands`
- Produces:
  - `fetchPopulation(url: string): Promise<PopulationRow[]>`
  - `fetchAgeDistribution(sex, ethnicity, year): Promise<PopulationRow[]>` — excludes `age === 'overall'`, sorted
  - `fetchPopulationTrend(sex, ethnicity): Promise<PopulationRow[]>` — `age=overall`, sorted by date ascending
  - `yearsFromTrend(rows: PopulationRow[]): number[]`

- [ ] **Step 1: Write failing tests**

`frontend/malaysia-stats/src/dosmClient.test.ts`:
```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  fetchAgeDistribution,
  fetchPopulation,
  fetchPopulationTrend,
  yearsFromTrend,
} from './dosmClient'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('fetchPopulation', () => {
  it('parses JSON array', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            date: '2024-01-01',
            sex: 'both',
            age: '0-4',
            ethnicity: 'overall',
            population: 100,
          },
        ],
      }),
    )
    const rows = await fetchPopulation('https://example.test')
    expect(rows).toHaveLength(1)
    expect(rows[0].population).toBe(100)
  })

  it('throws on non-OK', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500, statusText: 'err' }),
    )
    await expect(fetchPopulation('https://example.test')).rejects.toThrow(/500/)
  })
})

describe('fetchAgeDistribution', () => {
  it('drops overall and sorts ages', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          { date: '2024-01-01', sex: 'male', age: 'overall', ethnicity: 'overall', population: 9 },
          { date: '2024-01-01', sex: 'male', age: '5-9', ethnicity: 'overall', population: 2 },
          { date: '2024-01-01', sex: 'male', age: '0-4', ethnicity: 'overall', population: 1 },
        ],
      }),
    )
    const rows = await fetchAgeDistribution('male', 'overall', 2024)
    expect(rows.map((r) => r.age)).toEqual(['0-4', '5-9'])
  })
})

describe('yearsFromTrend', () => {
  it('extracts ascending unique years', () => {
    expect(
      yearsFromTrend([
        { date: '2020-01-01', sex: 'both', age: 'overall', ethnicity: 'overall', population: 1 },
        { date: '2019-01-01', sex: 'both', age: 'overall', ethnicity: 'overall', population: 1 },
      ]),
    ).toEqual([2019, 2020])
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd frontend/malaysia-stats && npm test
```
Expected: FAIL on missing `dosmClient` exports.

- [ ] **Step 3: Implement client**

`frontend/malaysia-stats/src/dosmClient.ts`:
```ts
import { compareAgeBands } from './ageSort'
import { buildPopulationUrl } from './dosmUrl'
import type { EthnicityCode, PopulationRow, SexCode } from './types'

export async function fetchPopulation(url: string): Promise<PopulationRow[]> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`OpenDOSM request failed: ${res.status} ${res.statusText}`)
  }
  const data: unknown = await res.json()
  if (!Array.isArray(data)) {
    throw new Error('OpenDOSM response was not an array')
  }
  return data as PopulationRow[]
}

export async function fetchAgeDistribution(
  sex: SexCode,
  ethnicity: EthnicityCode,
  year: number,
): Promise<PopulationRow[]> {
  const stamp = `${year}-01-01`
  const url = buildPopulationUrl({
    sex,
    ethnicity,
    dateStart: stamp,
    dateEnd: stamp,
    limit: 50,
  })
  const rows = await fetchPopulation(url)
  return rows
    .filter((r) => r.age !== 'overall')
    .sort((a, b) => compareAgeBands(a.age, b.age))
}

export async function fetchPopulationTrend(
  sex: SexCode,
  ethnicity: EthnicityCode,
): Promise<PopulationRow[]> {
  const url = buildPopulationUrl({
    sex,
    ethnicity,
    age: 'overall',
    dateStart: '1970-01-01',
    limit: 100,
  })
  const rows = await fetchPopulation(url)
  return [...rows].sort((a, b) => a.date.localeCompare(b.date))
}

export function yearsFromTrend(rows: PopulationRow[]): number[] {
  const years = rows.map((r) => Number(r.date.slice(0, 4)))
  return [...new Set(years)].sort((a, b) => a - b)
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd frontend/malaysia-stats && npm test
```
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/malaysia-stats/src/dosmClient.ts frontend/malaysia-stats/src/dosmClient.test.ts
git commit -m "Add OpenDOSM population fetch helpers with mocked tests."
```

---

### Task 4: UI — filters, charts, attribution, App wiring

**Files:**
- Create: `frontend/malaysia-stats/src/components/FilterBar.tsx`, `AgeChart.tsx`, `TrendChart.tsx`, `Attribution.tsx`
- Modify: `frontend/malaysia-stats/src/App.tsx`, `App.css`

**Interfaces:**
- Consumes: `SEX_OPTIONS`, `ETHNICITY_OPTIONS`, `fetchAgeDistribution`, `fetchPopulationTrend`, `yearsFromTrend`, Recharts
- Produces: working page with loading / error / empty states

- [ ] **Step 1: Add presentational components**

`FilterBar.tsx`:
```tsx
import { ETHNICITY_OPTIONS, SEX_OPTIONS } from '../labels'
import type { EthnicityCode, SexCode } from '../types'

type Props = {
  year: number
  years: number[]
  sex: SexCode
  ethnicity: EthnicityCode
  onYear: (y: number) => void
  onSex: (s: SexCode) => void
  onEthnicity: (e: EthnicityCode) => void
  disabled?: boolean
}

export function FilterBar({
  year,
  years,
  sex,
  ethnicity,
  onYear,
  onSex,
  onEthnicity,
  disabled,
}: Props) {
  return (
    <div className="filters">
      <label>
        Year
        <select
          value={year}
          disabled={disabled || years.length === 0}
          onChange={(e) => onYear(Number(e.target.value))}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </label>
      <label>
        Sex
        <select
          value={sex}
          disabled={disabled}
          onChange={(e) => onSex(e.target.value as SexCode)}
        >
          {SEX_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Ethnicity
        <select
          value={ethnicity}
          disabled={disabled}
          onChange={(e) => onEthnicity(e.target.value as EthnicityCode)}
        >
          {ETHNICITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
```

`AgeChart.tsx`:
```tsx
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { PopulationRow } from '../types'

type Props = { rows: PopulationRow[] }

export function AgeChart({ rows }: Props) {
  const data = rows.map((r) => ({ age: r.age, population: r.population }))
  if (data.length === 0) {
    return <p className="empty">No age data for this filter combination.</p>
  }
  return (
    <div className="chart">
      <h2>Age distribution</h2>
      <p className="chart-note">Population in thousands (&apos;000)</p>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="age" interval={0} angle={-35} textAnchor="end" height={70} />
          <YAxis />
          <Tooltip />
          <Bar dataKey="population" fill="#2563eb" name="Population ('000)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
```

`TrendChart.tsx`:
```tsx
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { PopulationRow } from '../types'

type Props = { rows: PopulationRow[] }

export function TrendChart({ rows }: Props) {
  const data = rows.map((r) => ({
    year: Number(r.date.slice(0, 4)),
    population: r.population,
  }))
  if (data.length === 0) {
    return <p className="empty">No trend data for this filter combination.</p>
  }
  return (
    <div className="chart">
      <h2>Population over time</h2>
      <p className="chart-note">Total population in thousands (&apos;000)</p>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="year" />
          <YAxis />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="population"
            stroke="#0f766e"
            strokeWidth={2}
            dot={false}
            name="Population ('000)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
```

`Attribution.tsx`:
```tsx
export function Attribution() {
  return (
    <footer className="attribution">
      Data from{' '}
      <a
        href="https://open.dosm.gov.my/data-catalogue/population_malaysia"
        target="_blank"
        rel="noreferrer"
      >
        OpenDOSM — Population Table: Malaysia
      </a>
      , Department of Statistics Malaysia. Licensed under{' '}
      <a
        href="https://creativecommons.org/licenses/by/4.0/"
        target="_blank"
        rel="noreferrer"
      >
        CC BY 4.0
      </a>
      .
    </footer>
  )
}
```

- [ ] **Step 2: Wire App.tsx**

Replace `App.tsx` with:
```tsx
import { useEffect, useState } from 'react'
import './App.css'
import { AgeChart } from './components/AgeChart'
import { Attribution } from './components/Attribution'
import { FilterBar } from './components/FilterBar'
import { TrendChart } from './components/TrendChart'
import {
  fetchAgeDistribution,
  fetchPopulationTrend,
  yearsFromTrend,
} from './dosmClient'
import type { EthnicityCode, PopulationRow, SexCode } from './types'

export default function App() {
  const [sex, setSex] = useState<SexCode>('both')
  const [ethnicity, setEthnicity] = useState<EthnicityCode>('overall')
  const [year, setYear] = useState(2024)
  const [years, setYears] = useState<number[]>([])
  const [trend, setTrend] = useState<PopulationRow[]>([])
  const [ages, setAges] = useState<PopulationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const trendRows = await fetchPopulationTrend(sex, ethnicity)
        if (cancelled) return
        const ys = yearsFromTrend(trendRows)
        setTrend(trendRows)
        setYears(ys)
        const nextYear = ys.includes(year) ? year : (ys[ys.length - 1] ?? year)
        if (nextYear !== year) setYear(nextYear)
        const ageRows = await fetchAgeDistribution(sex, ethnicity, nextYear)
        if (cancelled) return
        setAges(ageRows)
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load data')
          setTrend([])
          setAges([])
          setYears([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // year intentionally omitted: sex/ethnicity reload picks a valid year
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sex, ethnicity])

  useEffect(() => {
    let cancelled = false
    if (years.length === 0) return
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const ageRows = await fetchAgeDistribution(sex, ethnicity, year)
        if (!cancelled) setAges(ageRows)
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load age data')
          setAges([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [year, sex, ethnicity, years.length])

  return (
    <div className="app">
      <h1>Malaysia Stats</h1>
      <p className="subtitle">National population by age, sex, and ethnicity</p>

      <FilterBar
        year={year}
        years={years}
        sex={sex}
        ethnicity={ethnicity}
        onYear={setYear}
        onSex={setSex}
        onEthnicity={setEthnicity}
        disabled={loading && years.length === 0}
      />

      {error && <p className="error">{error}</p>}
      {loading && <p className="status">Loading OpenDOSM data…</p>}

      <AgeChart rows={ages} />
      <TrendChart rows={trend} />
      <Attribution />
    </div>
  )
}
```

**Note for implementer:** The dual `useEffect` above can double-fetch age on sex change. Prefer a cleaner single-effect pattern if easy — e.g. one effect for trend on `[sex, ethnicity]`, and a second that only runs age fetch when `year` changes *after* years are set, guarding with a ref — but correctness (filters work, no invented data) matters more than perfect fetch dedupe for v1.

Append to `App.css`:
```css
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1.5rem;
}
.filters label {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.85rem;
  font-weight: 600;
}
.filters select {
  min-width: 10rem;
  padding: 0.4rem 0.5rem;
  font: inherit;
}
.chart {
  background: #fff;
  border-radius: 8px;
  padding: 1rem 1rem 0.5rem;
  margin-bottom: 1.25rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}
.chart h2 { margin: 0 0 0.25rem; font-size: 1.15rem; }
.chart-note { margin: 0 0 0.75rem; font-size: 0.85rem; color: #666; }
.empty, .status, .error { margin: 0.75rem 0; }
.error { color: #b91c1c; }
.attribution {
  margin-top: 2rem;
  font-size: 0.85rem;
  color: #555;
  line-height: 1.5;
}
.attribution a { color: #1d4ed8; }
```

- [ ] **Step 3: Manual verify**

```bash
cd frontend/malaysia-stats && npm run dev
```
Open the local URL. Confirm:
- Charts load for Both / Overall
- Changing Sex / Ethnicity updates both charts
- Changing Year updates age chart
- Empty/error messaging if you temporarily break the API URL

Also run:
```bash
npm test
npm run build
```
Expected: tests PASS; build succeeds.

- [ ] **Step 4: Commit**

```bash
git add frontend/malaysia-stats
git commit -m "Add Malaysia Stats population filters and Recharts views."
```

---

### Task 5: Hub card, deploy workflow, README

**Files:**
- Modify: `frontend/index.html`, `.github/workflows/deploy-frontend.yml`, `README.md`

**Interfaces:**
- Produces: hub link + CI build path `/malaysia-stats/`

- [ ] **Step 1: Hub card**

In `frontend/index.html`, inside `.projects`, add after Diff Lab card (or after Places):
```html
            <a href="./malaysia-stats/" class="card">
                <div class="card-icon">📊</div>
                <h2>Malaysia Stats</h2>
                <p>National population by age, sex, and ethnicity from OpenDOSM.</p>
                <span class="status">🚀 Prototype</span>
            </a>
```

- [ ] **Step 2: Deploy workflow**

In `.github/workflows/deploy-frontend.yml`, after the diff-lab build steps, add install + build for malaysia-stats (same pattern as diff-lab). In “Prepare Pages”, add:
```bash
mkdir -p _site/malaysia-stats
cp -r frontend/malaysia-stats/dist/* _site/malaysia-stats/
```

- [ ] **Step 3: README**

Update projects table, structure tree, frontend run instructions, and GitHub Pages URL list to include Malaysia Stats / `malaysia-stats`.

- [ ] **Step 4: Commit**

```bash
git add frontend/index.html .github/workflows/deploy-frontend.yml README.md
git commit -m "Wire Malaysia Stats into hub, Pages deploy, and README."
```

---

### Task 6: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Run full local checks**

```bash
cd frontend/malaysia-stats
npm test
npm run build
```
Expected: PASS / build OK.

- [ ] **Step 2: Spec checklist**

Confirm against `docs/superpowers/specs/2026-10-26-malaysia-stats-design.md`:
- [ ] Hub path `/malaysia-stats/`
- [ ] Live OpenDOSM API, no DB
- [ ] Year / sex / ethnicity filters
- [ ] Age distribution + population trend
- [ ] Attribution CC BY 4.0
- [ ] Deploy workflow includes app

- [ ] **Step 3: Commit any leftover fixes** (only if needed), then stop for user review before push unless asked to push.

---

## Spec coverage (self-review)

| Spec requirement | Task |
|------------------|------|
| Vite app `frontend/malaysia-stats/` | 1 |
| OpenDOSM `population_malaysia` + filter syntax | 2–3 |
| Year / sex / ethnicity controls | 4 |
| Age distribution chart | 4 |
| Population over time chart | 4 |
| Loading / error / empty | 4 |
| Attribution CC BY 4.0 | 4 |
| Hub card | 5 |
| Deploy workflow | 5 |
| README | 5 |
| Unit tests for URL/labels | 2–3 |
| No DB / no tabs / no projections | honored via non-goals |

## Placeholder / consistency check

- Chart library locked to Recharts  
- Types `SexCode` / `EthnicityCode` / `PopulationRow` consistent across tasks  
- API base and dataset id match spec verbatim  
