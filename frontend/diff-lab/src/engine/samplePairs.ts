/** Shared FieldCodes OriginalDoc ↔ TrunkDnldDoc pairing helpers (no tests). */

/** Normalize names so "Foo-original.docx" pairs with "Foo.docx". */
export function normalizeDocxKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/\.docx$/i, '')
    .replace(/\s*\(\d+\)\s*$/g, '')
    .replace(/-original$/i, '')
    .replace(/_original$/i, '')
    .replace(/\s*\(ori\)\s*/gi, '')
    .replace(/-ori$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function pairSampleDocx(
  origNames: string[],
  trunkNames: string[]
): { key: string; orig: string; trunk: string }[] {
  const origDocx = origNames.filter((n) => n.toLowerCase().endsWith('.docx'))
  const trunkDocx = trunkNames.filter((n) => n.toLowerCase().endsWith('.docx'))

  const trunkByKey = new Map<string, string[]>()
  for (const t of trunkDocx) {
    const k = normalizeDocxKey(t)
    const list = trunkByKey.get(k) ?? []
    list.push(t)
    trunkByKey.set(k, list)
  }

  const usedTrunk = new Set<string>()
  const pairs: { key: string; orig: string; trunk: string }[] = []

  for (const o of origDocx) {
    if (trunkDocx.includes(o) && !usedTrunk.has(o)) {
      pairs.push({ key: normalizeDocxKey(o), orig: o, trunk: o })
      usedTrunk.add(o)
    }
  }

  for (const o of origDocx) {
    if (pairs.some((p) => p.orig === o)) continue
    const k = normalizeDocxKey(o)
    const cands = (trunkByKey.get(k) ?? []).filter((t) => !usedTrunk.has(t))
    if (cands.length === 0) continue
    cands.sort((a, b) => a.length - b.length)
    const t = cands[0]
    pairs.push({ key: k, orig: o, trunk: t })
    usedTrunk.add(t)
  }

  return pairs
}
