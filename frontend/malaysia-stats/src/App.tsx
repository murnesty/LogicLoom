import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { AgeChart } from './components/AgeChart'
import { Attribution } from './components/Attribution'
import { BirthsChart } from './components/BirthsChart'
import {
  DecadeCompareChart,
  type DecadeComparePoint,
} from './components/DecadeCompareChart'
import { DecadeStrip } from './components/DecadeStrip'
import { GlobalFilters } from './components/GlobalFilters'
import { TabBar, type AppTab } from './components/TabBar'
import { runBirthModel, type BirthModelResult } from './birthModel'
import {
  DECADES,
  decadeOfYear,
  pickDecadeSnapshotYear,
  yearsInDecade,
} from './decades'
import {
  fetchAgeDistribution,
  fetchBirthsAnnual,
  fetchMarriagesAnnual,
  fetchModelAgeBandsByYear,
  fetchPopulationTrend,
  yearsFromTrend,
} from './dosmClient'
import type { EthnicityCode, MarriageRow, PopulationRow, SexCode } from './types'

export default function App() {
  const [tab, setTab] = useState<AppTab>('decades')
  const [sex, setSex] = useState<SexCode>('both')
  const [ethnicity, setEthnicity] = useState<EthnicityCode>('overall')
  const [decadeStart, setDecadeStart] = useState(2010)

  const [popYears, setPopYears] = useState<number[]>([])
  const [ages, setAges] = useState<PopulationRow[]>([])
  const [snapshotYear, setSnapshotYear] = useState<number | null>(null)
  const [popLoading, setPopLoading] = useState(true)
  const [ageLoading, setAgeLoading] = useState(false)
  const [popError, setPopError] = useState<string | null>(null)

  const [birthModel, setBirthModel] = useState<BirthModelResult | null>(null)
  const [marriages, setMarriages] = useState<MarriageRow[]>([])
  const [seriesLoading, setSeriesLoading] = useState(true)
  const [seriesError, setSeriesError] = useState<string | null>(null)

  const availableDecadeStarts = useMemo(() => {
    const set = new Set<number>()
    for (const y of popYears) set.add(decadeOfYear(y))
    return set
  }, [popYears])

  // Population years for decade availability (respects sex/ethnicity).
  useEffect(() => {
    let cancelled = false
    setPopLoading(true)
    setPopError(null)
    ;(async () => {
      try {
        const trend = await fetchPopulationTrend(sex, ethnicity)
        if (cancelled) return
        const ys = yearsFromTrend(trend)
        setPopYears(ys)
        setDecadeStart((prev) => {
          if (ys.some((y) => decadeOfYear(y) === prev)) return prev
          const last = ys[ys.length - 1]
          return last != null ? decadeOfYear(last) : prev
        })
      } catch (e) {
        if (!cancelled) {
          setPopError(e instanceof Error ? e.message : 'Failed to load population years')
          setPopYears([])
        }
      } finally {
        if (!cancelled) setPopLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [sex, ethnicity])

  // Age pyramid for selected decade end (or latest in-decade year).
  useEffect(() => {
    const snap = pickDecadeSnapshotYear(decadeStart, popYears)
    setSnapshotYear(snap)
    if (snap == null) {
      setAges([])
      return
    }
    let cancelled = false
    setAgeLoading(true)
    setPopError(null)
    ;(async () => {
      try {
        const rows = await fetchAgeDistribution(sex, ethnicity, snap)
        if (!cancelled) setAges(rows)
      } catch (e) {
        if (!cancelled) {
          setPopError(e instanceof Error ? e.message : 'Failed to load age distribution')
          setAges([])
        }
      } finally {
        if (!cancelled) setAgeLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [decadeStart, popYears, sex, ethnicity])

  // Birth model (national both/overall) + marriages (sex-aware) — shared by Decades + Births lab.
  useEffect(() => {
    let cancelled = false
    setSeriesLoading(true)
    setSeriesError(null)
    ;(async () => {
      try {
        const [birthRows, agePack, marriageRows] = await Promise.all([
          fetchBirthsAnnual(),
          fetchModelAgeBandsByYear(),
          fetchMarriagesAnnual(sex),
        ])
        if (cancelled) return
        const model = runBirthModel({
          births: birthRows.map((r) => ({
            year: Number(r.date.slice(0, 4)),
            births: r.abs,
          })),
          bandPopByYear: agePack.bandPopByYear,
          lastPopYear: agePack.lastPopYear,
        })
        setBirthModel(model)
        setMarriages(marriageRows)
      } catch (e) {
        if (!cancelled) {
          setSeriesError(e instanceof Error ? e.message : 'Failed to load births/marriages')
          setBirthModel(null)
          setMarriages([])
        }
      } finally {
        if (!cancelled) setSeriesLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [sex])

  const decadeLabel =
    DECADES.find((d) => d.start === decadeStart)?.label ?? `${decadeStart}s`

  const decadePoints: DecadeComparePoint[] = useMemo(() => {
    const years = yearsInDecade(decadeStart)
    const modelByYear = new Map(
      (birthModel?.series ?? []).map((p) => [p.year, p] as const),
    )
    const marriageByYear = new Map(
      marriages.map((m) => [Number(m.date.slice(0, 4)), m] as const),
    )
    return years.map((year) => {
      const m = modelByYear.get(year)
      const mar = marriageByYear.get(year)
      return {
        year,
        actualBirths: m?.actual ?? null,
        modelBirths: m?.model ?? null,
        marriages: mar?.abs ?? null,
        marriageRate: mar?.rate ?? null,
      }
    })
  }, [decadeStart, birthModel, marriages])

  const loading = popLoading || ageLoading || seriesLoading

  return (
    <div className="app">
      <h1>Malaysia Stats</h1>
      <p className="subtitle">
        Pick a decade of actual data — age structure, births vs model, and marriages —
        to see what feeds (and breaks) a simple forecast.
      </p>

      <GlobalFilters
        sex={sex}
        ethnicity={ethnicity}
        onSex={setSex}
        onEthnicity={setEthnicity}
        disabled={popLoading && popYears.length === 0}
      />

      <TabBar tab={tab} onTab={setTab} />

      {popError && <p className="error">{popError}</p>}
      {seriesError && <p className="error">{seriesError}</p>}
      {loading && <p className="status">Loading OpenDOSM data…</p>}

      {tab === 'decades' && (
        <>
          <DecadeStrip
            selected={decadeStart}
            availableStarts={availableDecadeStarts}
            onSelect={setDecadeStart}
          />

          <p className="decade-meta">
            {snapshotYear != null ? (
              <>
                Age snapshot: <strong>{snapshotYear}</strong> (end of decade, or latest
                year available in {decadeLabel}). Sex/ethnicity filters apply to the age
                chart. Births are national totals; marriage series follows Sex (Both uses
                female registration counts). Birth model still uses both sexes / overall
                ethnicity.
              </>
            ) : (
              <>No population years in {decadeLabel} for this filter.</>
            )}
          </p>

          {ethnicity !== 'overall' && (
            <p className="callout">
              Ethnicity filter does not apply to national births or marriages APIs —
              only the age pyramid changes.
            </p>
          )}

          <AgeChart
            rows={ages}
            title={`Age distribution · ${snapshotYear ?? '—'}`}
            highlightParentAge
          />
          <DecadeCompareChart points={decadePoints} decadeLabel={decadeLabel} />
        </>
      )}

      {tab === 'births' && (
        <>
          <p className="chart-note" style={{ marginBottom: '1rem' }}>
            Full actual-vs-model series (parent-age rate trained 2000–2015). Decades tab
            is better for explaining one period at a time.
          </p>
          {!seriesLoading && <BirthsChart model={birthModel} />}
        </>
      )}

      <Attribution
        extra={[
          {
            href: 'https://open.dosm.gov.my/data-catalogue/births_annual',
            label: 'Annual Live Births',
          },
          {
            href: 'https://open.dosm.gov.my/data-catalogue/marriages',
            label: 'Annual Marriages',
          },
        ]}
      />
    </div>
  )
}
