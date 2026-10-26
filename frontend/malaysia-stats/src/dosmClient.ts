import { compareAgeBands } from './ageSort'
import { MODEL_AGE_BANDS } from './birthModel'
import { buildBirthsUrl, buildPopulationUrl } from './dosmUrl'
import type { BirthRow, EthnicityCode, PopulationRow, SexCode } from './types'
import type { BandPopByYear } from './birthModel'

export async function fetchJsonArray<T>(url: string): Promise<T[]> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`OpenDOSM request failed: ${res.status} ${res.statusText}`)
  }
  const data: unknown = await res.json()
  if (!Array.isArray(data)) {
    throw new Error('OpenDOSM response was not an array')
  }
  return data as T[]
}

export async function fetchPopulation(url: string): Promise<PopulationRow[]> {
  return fetchJsonArray<PopulationRow>(url)
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

export async function fetchBirthsAnnual(): Promise<BirthRow[]> {
  const url = buildBirthsUrl({ dateStart: '1970-01-01', limit: 100 })
  const rows = await fetchJsonArray<BirthRow>(url)
  return rows.slice().sort((a, b) => a.date.localeCompare(b.date))
}

/** Load model age bands (thousands) for both sexes / overall ethnicity across years. */
export async function fetchModelAgeBandsByYear(): Promise<{
  bandPopByYear: BandPopByYear
  lastPopYear: number
}> {
  const bandRows = await Promise.all(
    MODEL_AGE_BANDS.map(async (age) => {
      const url = buildPopulationUrl({
        sex: 'both',
        ethnicity: 'overall',
        age,
        dateStart: '1970-01-01',
        limit: 100,
      })
      const rows = await fetchPopulation(url)
      return { age, rows }
    }),
  )

  const bandPopByYear: BandPopByYear = new Map()
  let lastPopYear = 0
  for (const { age, rows } of bandRows) {
    for (const row of rows) {
      const year = Number(row.date.slice(0, 4))
      if (!bandPopByYear.has(year)) bandPopByYear.set(year, new Map())
      bandPopByYear.get(year)!.set(age, row.population)
      if (year > lastPopYear) lastPopYear = year
    }
  }
  return { bandPopByYear, lastPopYear }
}
