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

type TrendState = {
  key: string
  rows: PopulationRow[]
  years: number[]
}

export default function App() {
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
