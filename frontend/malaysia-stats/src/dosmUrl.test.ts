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
