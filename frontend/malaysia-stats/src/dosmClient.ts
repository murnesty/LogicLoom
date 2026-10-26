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
