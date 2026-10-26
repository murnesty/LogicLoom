import { describe, expect, it } from 'vitest'
import { decadeEndYear, pickDecadeSnapshotYear, yearsInDecade } from './decades'

describe('decades', () => {
  it('end year is start+9', () => {
    expect(decadeEndYear(1980)).toBe(1989)
  })

  it('lists ten years', () => {
    expect(yearsInDecade(2000)).toEqual([
      2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009,
    ])
  })

  it('prefers end year when available', () => {
    expect(pickDecadeSnapshotYear(2010, [2010, 2015, 2019])).toBe(2019)
  })

  it('falls back to latest in-decade year', () => {
    expect(pickDecadeSnapshotYear(2020, [2020, 2024, 2026])).toBe(2026)
  })

  it('returns null when no overlap', () => {
    expect(pickDecadeSnapshotYear(1970, [2000, 2001])).toBeNull()
  })
})
