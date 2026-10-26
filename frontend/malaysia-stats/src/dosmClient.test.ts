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
