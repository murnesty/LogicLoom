import { describe, expect, it } from 'vitest'
import {
  parentAgePersons,
  runBirthModel,
  stepAgeBandsOneYear,
  trainRate,
} from './birthModel'

describe('parentAgePersons', () => {
  it('sums 20–39 bands and converts thousands to persons', () => {
    const bands = new Map([
      ['20-24', 1],
      ['25-29', 2],
      ['30-34', 3],
      ['35-39', 4],
      ['15-19', 99],
    ])
    expect(parentAgePersons(bands)).toBe(10_000)
  })
})

describe('trainRate', () => {
  it('averages births / parents over the training window', () => {
    const births = new Map([
      [2000, 1000],
      [2001, 2000],
    ])
    const bandPopByYear = new Map([
      [2000, new Map([['20-24', 1], ['25-29', 0], ['30-34', 0], ['35-39', 0]])],
      [2001, new Map([['20-24', 1], ['25-29', 0], ['30-34', 0], ['35-39', 0]])],
    ])
    // pad to MIN_TRAIN_YEARS
    for (let y = 2002; y <= 2006; y++) {
      births.set(y, 1000)
      bandPopByYear.set(
        y,
        new Map([['20-24', 1], ['25-29', 0], ['30-34', 0], ['35-39', 0]]),
      )
    }
    const trained = trainRate(births, bandPopByYear, 2000, 2006)
    expect(trained).not.toBeNull()
    // parents=1000 persons; rates 1,2,1,1,1,1,1 → mean 8/7
    expect(trained!.rate).toBeCloseTo(8 / 7, 10)
    expect(trained!.trainYears).toHaveLength(7)
  })

  it('returns null when too few training years', () => {
    expect(trainRate(new Map([[2000, 1]]), new Map(), 2000, 2015)).toBeNull()
  })
})

describe('stepAgeBandsOneYear', () => {
  it('moves 20% of a band into the next band', () => {
    const bands = new Map([
      ['10-14', 0],
      ['15-19', 0],
      ['20-24', 100],
      ['25-29', 0],
      ['30-34', 0],
      ['35-39', 0],
    ])
    const next = stepAgeBandsOneYear(bands)
    expect(next.get('20-24')).toBeCloseTo(80)
    expect(next.get('25-29')).toBeCloseTo(20)
  })
})

describe('buildBirthModelSeries / runBirthModel', () => {
  it('backtests past years and forecasts after last actual birth year', () => {
    const births = []
    const bandPopByYear = new Map<number, Map<string, number>>()
    for (let y = 2000; y <= 2010; y++) {
      births.push({ year: y, births: 2000 })
      bandPopByYear.set(
        y,
        new Map([
          ['10-14', 1],
          ['15-19', 1],
          ['20-24', 1],
          ['25-29', 1],
          ['30-34', 1],
          ['35-39', 1],
        ]),
      )
    }
    const result = runBirthModel({
      births,
      bandPopByYear,
      lastPopYear: 2010,
    })
    expect(result).not.toBeNull()
    // parents = 4*1000 = 4000; rate = 2000/4000 = 0.5
    expect(result!.rate).toBeCloseTo(0.5)
    const back = result!.series.filter((p) => p.kind === 'backtest')
    expect(back.length).toBeGreaterThan(0)
    expect(back.every((p) => p.actual === 2000)).toBe(true)
    const forecast = result!.series.filter((p) => p.kind === 'forecast')
    expect(forecast.length).toBeGreaterThan(0)
    expect(forecast[0].year).toBe(2011)
    expect(forecast.every((p) => p.actual == null && p.model != null)).toBe(true)
  })
})
