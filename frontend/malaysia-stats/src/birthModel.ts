/** Parent-age bands used for the illustrative birth model (persons aged 20–39). */
export const PARENT_AGE_BANDS = ['20-24', '25-29', '30-34', '35-39'] as const

/** Extra younger bands needed to age-forward into parent ages. */
export const FEEDER_AGE_BANDS = ['10-14', '15-19'] as const

export const MODEL_AGE_BANDS = [...FEEDER_AGE_BANDS, ...PARENT_AGE_BANDS] as const

export const TRAIN_START = 2000
export const TRAIN_END = 2015
export const FORECAST_END = 2030
/** Minimum usable training years before we refuse to invent a rate. */
export const MIN_TRAIN_YEARS = 5

export type BirthPoint = { year: number; births: number }

export type BandPopByYear = Map<number, Map<string, number>>

export type BirthModelSeriesPoint = {
  year: number
  actual: number | null
  model: number | null
  kind: 'backtest' | 'forecast'
}

export type BirthModelResult = {
  rate: number
  trainYears: number[]
  series: BirthModelSeriesPoint[]
}

/** Sum parent-age population in *persons* (API values are thousands). */
export function parentAgePersons(bandPop: Map<string, number>): number {
  let sum000 = 0
  for (const band of PARENT_AGE_BANDS) {
    sum000 += bandPop.get(band) ?? 0
  }
  return sum000 * 1000
}

export function trainRate(
  birthsByYear: Map<number, number>,
  bandPopByYear: BandPopByYear,
  trainStart = TRAIN_START,
  trainEnd = TRAIN_END,
): { rate: number; trainYears: number[] } | null {
  const rates: number[] = []
  const trainYears: number[] = []
  for (let y = trainStart; y <= trainEnd; y++) {
    const births = birthsByYear.get(y)
    const bands = bandPopByYear.get(y)
    if (births == null || !bands) continue
    const parents = parentAgePersons(bands)
    if (parents <= 0) continue
    rates.push(births / parents)
    trainYears.push(y)
  }
  if (rates.length < MIN_TRAIN_YEARS) return null
  const rate = rates.reduce((a, b) => a + b, 0) / rates.length
  return { rate, trainYears }
}

/** Move ~1/5 of each 5-year band into the next band (illustrative; no mortality). */
export function stepAgeBandsOneYear(bands: Map<string, number>): Map<string, number> {
  const order = [...MODEL_AGE_BANDS]
  const next = new Map<string, number>()
  for (const band of order) next.set(band, 0)

  for (let i = 0; i < order.length; i++) {
    const band = order[i]
    const stock = bands.get(band) ?? 0
    const stay = stock * 0.8
    const leave = stock * 0.2
    next.set(band, (next.get(band) ?? 0) + stay)
    if (i + 1 < order.length) {
      const dest = order[i + 1]
      next.set(dest, (next.get(dest) ?? 0) + leave)
    }
    // Mass leaving 35–39 exits the parent window (not tracked further).
  }
  return next
}

export function buildBirthModelSeries(params: {
  birthsByYear: Map<number, number>
  bandPopByYear: BandPopByYear
  rate: number
  lastPopYear: number
  forecastEnd?: number
}): BirthModelSeriesPoint[] {
  const forecastEnd = params.forecastEnd ?? FORECAST_END
  const birthYears = [...params.birthsByYear.keys()].sort((a, b) => a - b)
  const lastBirthYear = birthYears.length ? birthYears[birthYears.length - 1] : null

  const series: BirthModelSeriesPoint[] = []

  const allPastYears = new Set<number>([
    ...params.birthsByYear.keys(),
    ...params.bandPopByYear.keys(),
  ])
  const pastSorted = [...allPastYears].sort((a, b) => a - b)

  for (const year of pastSorted) {
    if (lastBirthYear != null && year > lastBirthYear) continue
    const actual = params.birthsByYear.get(year) ?? null
    const bands = params.bandPopByYear.get(year)
    const model =
      bands != null ? params.rate * parentAgePersons(bands) : null
    if (actual == null && model == null) continue
    series.push({ year, actual, model, kind: 'backtest' })
  }

  const baseBands = params.bandPopByYear.get(params.lastPopYear)
  if (!baseBands || lastBirthYear == null) return series

  let rolling = new Map(baseBands)
  // Align rolling stock to lastPopYear, then step forward year by year.
  for (let y = params.lastPopYear + 1; y <= forecastEnd; y++) {
    rolling = stepAgeBandsOneYear(rolling)
    if (y <= lastBirthYear) continue
    series.push({
      year: y,
      actual: null,
      model: params.rate * parentAgePersons(rolling),
      kind: 'forecast',
    })
  }

  return series
}

export function runBirthModel(params: {
  births: BirthPoint[]
  /** population '000 by year then age band */
  bandPopByYear: BandPopByYear
  lastPopYear: number
}): BirthModelResult | null {
  const birthsByYear = new Map(params.births.map((b) => [b.year, b.births]))
  const trained = trainRate(birthsByYear, params.bandPopByYear)
  if (!trained) return null
  const series = buildBirthModelSeries({
    birthsByYear,
    bandPopByYear: params.bandPopByYear,
    rate: trained.rate,
    lastPopYear: params.lastPopYear,
  })
  return { rate: trained.rate, trainYears: trained.trainYears, series }
}
