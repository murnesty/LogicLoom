/** Sort age bands ascending; `overall` last. */
export function compareAgeBands(a: string, b: string): number {
  if (a === 'overall' && b === 'overall') return 0
  if (a === 'overall') return 1
  if (b === 'overall') return -1
  const rank = (s: string): number => {
    const plus = s.match(/^(\d+)\+$/)
    if (plus) return Number(plus[1])
    const range = s.match(/^(\d+)-/)
    if (range) return Number(range[1])
    return Number.POSITIVE_INFINITY
  }
  return rank(a) - rank(b)
}
