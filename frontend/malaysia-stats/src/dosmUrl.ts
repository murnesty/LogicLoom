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
  return `${BASE}?${q.toString().replace(/%40/g, '@').replace(/%2C/g, ',')}`
}

export function buildBirthsUrl(params?: {
  dateStart?: string
  dateEnd?: string
  limit?: number
}): string {
  const q = new URLSearchParams()
  q.set('id', 'births_annual')
  if (params?.dateStart) q.set('date_start', `${params.dateStart}@date`)
  if (params?.dateEnd) q.set('date_end', `${params.dateEnd}@date`)
  q.set('limit', String(params?.limit ?? 100))
  return `${BASE}?${q.toString().replace(/%40/g, '@').replace(/%2C/g, ',')}`
}

export function buildMarriagesUrl(params?: {
  sex?: 'male' | 'female'
  dateStart?: string
  dateEnd?: string
  limit?: number
}): string {
  const q = new URLSearchParams()
  q.set('id', 'marriages')
  if (params?.sex) q.set('filter', `${params.sex}@sex`)
  if (params?.dateStart) q.set('date_start', `${params.dateStart}@date`)
  if (params?.dateEnd) q.set('date_end', `${params.dateEnd}@date`)
  q.set('limit', String(params?.limit ?? 100))
  return `${BASE}?${q.toString().replace(/%40/g, '@').replace(/%2C/g, ',')}`
}
