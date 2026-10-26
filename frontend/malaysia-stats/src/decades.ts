export type Decade = {
  /** e.g. 1980 */
  start: number
  /** Display label e.g. "1980s" */
  label: string
}

/** Calendar decades from 1970s through 2020s. */
export const DECADES: Decade[] = [1970, 1980, 1990, 2000, 2010, 2020].map((start) => ({
  start,
  label: `${start}s`,
}))

export function decadeEndYear(start: number): number {
  return start + 9
}

export function yearsInDecade(start: number): number[] {
  return Array.from({ length: 10 }, (_, i) => start + i)
}

/** Prefer end-of-decade year; otherwise latest available year that falls in the decade. */
export function pickDecadeSnapshotYear(
  start: number,
  availableYears: number[],
): number | null {
  const inDecade = availableYears.filter((y) => y >= start && y <= start + 9)
  if (inDecade.length === 0) return null
  const end = decadeEndYear(start)
  if (inDecade.includes(end)) return end
  return inDecade[inDecade.length - 1]
}

export function decadeOfYear(year: number): number {
  return Math.floor(year / 10) * 10
}
