import { useEffect, useState } from 'react'
import './App.css'
import { AgeChart } from './components/AgeChart'
import { Attribution } from './components/Attribution'
import { BirthsChart } from './components/BirthsChart'
import { FilterBar } from './components/FilterBar'
import { TabBar, type AppTab } from './components/TabBar'
import { TrendChart } from './components/TrendChart'
import { runBirthModel, type BirthModelResult } from './birthModel'
import {
  fetchAgeDistribution,
  fetchBirthsAnnual,
  fetchModelAgeBandsByYear,
  fetchPopulationTrend,
  yearsFromTrend,
} from './dosmClient'
import type { EthnicityCode, PopulationRow, SexCode } from './types'

type TrendState = {
  key: string
  rows: PopulationRow[]
  years: number[]
}

export default function App() {
  const [tab, setTab] = useState<AppTab>('population')
  const [sex, setSex] = useState<SexCode>('both')
  const [ethnicity, setEthnicity] = useState<EthnicityCode>('overall')
  const [year, setYear] = useState(2024)
  const [trendState, setTrendState] = useState<TrendState>({
    key: '',
    rows: [],
    years: [],
  })
  const [ages, setAges] = useState<PopulationRow[]>([])
  const [trendLoading, setTrendLoading] = useState(true)
  const [ageLoading, setAgeLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [birthModel, setBirthModel] = useState<BirthModelResult | null>(null)
  const [birthsLoading, setBirthsLoading] = useState(false)
  const [birthsError, setBirthsError] = useState<string | null>(null)
  const [birthsLoaded, setBirthsLoaded] = useState(false)

  const currentKey = `${sex}:${ethnicity}`
  const years = trendState.key === currentKey ? trendState.years : []
  const trend = trendState.key === currentKey ? trendState.rows : []
  const loading = trendLoading || ageLoading

  useEffect(() => {
    let cancelled = false
    const key = `${sex}:${ethnicity}`
    setTrendLoading(true)
    setError(null)
    ;(async () => {
      try {
        const trendRows = await fetchPopulationTrend(sex, ethnicity)
        if (cancelled) return
        const ys = yearsFromTrend(trendRows)
        if (ys.length > 0) {
          setAgeLoading(true)
          setYear((prev) => (ys.includes(prev) ? prev : ys[ys.length - 1]))
        } else {
          setAgeLoading(false)
          setAges([])
        }
        setTrendState({ key, rows: trendRows, years: ys })
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load data')
          setTrendState({ key, rows: [], years: [] })
          setAges([])
          setAgeLoading(false)
        }
      } finally {
        if (!cancelled) setTrendLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [sex, ethnicity])

  useEffect(() => {
    if (years.length === 0 || !years.includes(year)) return
    let cancelled = false
    setAgeLoading(true)
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
        if (!cancelled) setAgeLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [year, sex, ethnicity, years])

  useEffect(() => {
    if (tab !== 'births' || birthsLoaded) return
    let cancelled = false
    setBirthsLoading(true)
    setBirthsError(null)
    ;(async () => {
      try {
        const [birthRows, agePack] = await Promise.all([
          fetchBirthsAnnual(),
          fetchModelAgeBandsByYear(),
        ])
        if (cancelled) return
        const result = runBirthModel({
          births: birthRows.map((r) => ({
            year: Number(r.date.slice(0, 4)),
            births: r.abs,
          })),
          bandPopByYear: agePack.bandPopByYear,
          lastPopYear: agePack.lastPopYear,
        })
        setBirthModel(result)
        setBirthsLoaded(true)
      } catch (e) {
        if (!cancelled) {
          setBirthsError(e instanceof Error ? e.message : 'Failed to load births model')
          setBirthModel(null)
        }
      } finally {
        if (!cancelled) setBirthsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [tab, birthsLoaded])

  return (
    <div className="app">
      <h1>Malaysia Stats</h1>
      <p className="subtitle">
        {tab === 'population'
          ? 'National population by age, sex, and ethnicity'
          : 'Actual births vs parent-age illustrative model'}
      </p>

      <TabBar tab={tab} onTab={setTab} />

      {tab === 'population' && (
        <>
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
        </>
      )}

      {tab === 'births' && (
        <>
          {birthsError && <p className="error">{birthsError}</p>}
          {birthsLoading && <p className="status">Loading births + parent-age series…</p>}
          {!birthsLoading && <BirthsChart model={birthModel} />}
          <Attribution
            extra={[
              {
                href: 'https://open.dosm.gov.my/data-catalogue/births_annual',
                label: 'Annual Live Births',
              },
            ]}
          />
        </>
      )}
    </div>
  )
}
