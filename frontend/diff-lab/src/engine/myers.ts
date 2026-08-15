import type { Algorithm, DiffOp, EqualsFn } from './types'

const defaultEq: EqualsFn = (x, y) => x === y

/** Above this, summarize identical instead of N keep ops. */
const IDENTICAL_EXPAND_MAX = 4_000

/** Full Myers+trace only below this (avoids OOM + stack overflow). */
const MYERS_TRACE_MAX = 3_000

/**
 * Myers SES for Diff Lab.
 * - Small pockets: classic O(ND) with V-trace (bounded size).
 * - Large pockets: unique-line anchors + greedy (iterative, no deep recursion).
 */
export function myersSes(
  a: string[],
  b: string[],
  equals: EqualsFn = defaultEq
): DiffOp[] {
  if (a.length === 0 && b.length === 0) return []

  if (a.length === b.length) {
    let same = true
    for (let i = 0; i < a.length; i++) {
      if (!equals(a[i], b[i])) {
        same = false
        break
      }
    }
    if (same) {
      if (a.length > IDENTICAL_EXPAND_MAX) {
        return [
          {
            kind: 'hdr',
            text: `[identical] ${a.length} lines — skipped rendering every keep row`,
          },
        ]
      }
      return a.map((text) => ({ kind: 'keep' as const, text }))
    }
  }

  let loA = 0
  let loB = 0
  let hiA = a.length
  let hiB = b.length

  while (loA < hiA && loB < hiB && equals(a[loA], b[loB])) {
    loA++
    loB++
  }
  while (hiA > loA && hiB > loB && equals(a[hiA - 1], b[hiB - 1])) {
    hiA--
    hiB--
  }

  const prefix: DiffOp[] = []
  for (let i = 0; i < loA; i++) prefix.push({ kind: 'keep', text: a[i] })
  const suffix: DiffOp[] = []
  for (let i = hiA; i < a.length; i++) suffix.push({ kind: 'keep', text: a[i] })

  const midA = a.slice(loA, hiA)
  const midB = b.slice(loB, hiB)

  if (midA.length === 0 && midB.length === 0) {
    return concatOps([prefix, suffix])
  }
  if (midA.length === 0) {
    return concatOps([
      prefix,
      midB.map((text) => ({ kind: 'ins' as const, text })),
      suffix,
    ])
  }
  if (midB.length === 0) {
    return concatOps([
      prefix,
      midA.map((text) => ({ kind: 'del' as const, text })),
      suffix,
    ])
  }

  const mid =
    midA.length + midB.length <= MYERS_TRACE_MAX
      ? myersTrace(midA, midB, equals)
      : largeAlign(midA, midB, equals)

  return concatOps([prefix, mid, suffix])
}

function concatOps(parts: DiffOp[][]): DiffOp[] {
  let n = 0
  for (const p of parts) n += p.length
  const out = new Array<DiffOp>(n)
  let i = 0
  for (const p of parts) {
    for (let j = 0; j < p.length; j++) out[i++] = p[j]
  }
  return out
}

/** Classic Myers with V copies — only for small n+m. */
function myersTrace(a: string[], b: string[], equals: EqualsFn): DiffOp[] {
  const n = a.length
  const m = b.length
  const max = n + m
  const offset = max
  const v = new Int32Array(2 * max + 2)
  const trace: Int32Array[] = []

  let foundD = -1
  outer: for (let d = 0; d <= max; d++) {
    for (let k = -d; k <= d; k += 2) {
      let x: number
      if (k === -d || (k !== d && v[k - 1 + offset] < v[k + 1 + offset])) {
        x = v[k + 1 + offset]
      } else {
        x = v[k - 1 + offset] + 1
      }
      let y = x - k
      while (x < n && y < m && equals(a[x], b[y])) {
        x++
        y++
      }
      v[k + offset] = x
      if (x >= n && y >= m) {
        trace.push(Int32Array.from(v))
        foundD = d
        break outer
      }
    }
    trace.push(Int32Array.from(v))
  }

  if (foundD < 0) {
    return [
      ...a.map((text) => ({ kind: 'del' as const, text })),
      ...b.map((text) => ({ kind: 'ins' as const, text })),
    ]
  }

  const edits: DiffOp[] = []
  let x = n
  let y = m
  for (let d = foundD; d > 0; d--) {
    const vPrev = trace[d - 1]
    const k = x - y
    const prevK =
      k === -d || (k !== d && vPrev[k - 1 + offset] < vPrev[k + 1 + offset])
        ? k + 1
        : k - 1
    const prevX = vPrev[prevK + offset]
    const prevY = prevX - prevK
    while (x > prevX && y > prevY) {
      x--
      y--
      edits.push({ kind: 'keep', text: a[x] })
    }
    if (x === prevX) {
      y--
      edits.push({ kind: 'ins', text: b[y] })
    } else {
      x--
      edits.push({ kind: 'del', text: a[x] })
    }
    x = prevX
    y = prevY
  }
  while (x > 0 && y > 0) {
    x--
    y--
    edits.push({ kind: 'keep', text: a[x] })
  }
  while (x > 0) {
    x--
    edits.push({ kind: 'del', text: a[x] })
  }
  while (y > 0) {
    y--
    edits.push({ kind: 'ins', text: b[y] })
  }
  edits.reverse()
  return edits
}

/** Iterative: unique shared lines as anchors, Myers/greedy between them. */
function largeAlign(a: string[], b: string[], equals: EqualsFn): DiffOp[] {
  const countA = new Map<string, number>()
  const countB = new Map<string, number>()
  for (const L of a) countA.set(L, (countA.get(L) ?? 0) + 1)
  for (const L of b) countB.set(L, (countB.get(L) ?? 0) + 1)

  type Anchor = { ai: number; bi: number }
  const anchors: Anchor[] = []
  let biScan = 0
  for (let ai = 0; ai < a.length; ai++) {
    const L = a[ai]
    if ((countA.get(L) ?? 0) !== 1) continue
    if ((countB.get(L) ?? 0) !== 1) continue
    let bi = -1
    for (let j = biScan; j < b.length; j++) {
      if (equals(b[j], L)) {
        bi = j
        break
      }
    }
    if (bi < 0) continue
    // Keep anchors in increasing order on both sides
    if (anchors.length && (ai <= anchors[anchors.length - 1].ai || bi <= anchors[anchors.length - 1].bi)) {
      continue
    }
    anchors.push({ ai, bi })
    biScan = bi + 1
  }

  const out: DiffOp[] = []
  let ai = 0
  let bi = 0
  for (const an of anchors) {
    appendOps(out, pocket(a.slice(ai, an.ai), b.slice(bi, an.bi), equals))
    out.push({ kind: 'keep', text: a[an.ai] })
    ai = an.ai + 1
    bi = an.bi + 1
  }
  appendOps(out, pocket(a.slice(ai), b.slice(bi), equals))
  return out
}

function appendOps(dest: DiffOp[], src: DiffOp[]): void {
  for (let i = 0; i < src.length; i++) dest.push(src[i])
}

function pocket(a: string[], b: string[], equals: EqualsFn): DiffOp[] {
  if (a.length === 0 && b.length === 0) return []
  if (a.length === 0) return b.map((text) => ({ kind: 'ins' as const, text }))
  if (b.length === 0) return a.map((text) => ({ kind: 'del' as const, text }))
  if (a.length + b.length <= MYERS_TRACE_MAX) return myersTrace(a, b, equals)
  return greedyAlign(a, b, equals)
}

function greedyAlign(a: string[], b: string[], equals: EqualsFn): DiffOp[] {
  const unused = new Array(b.length).fill(true)
  const out: DiffOp[] = []
  for (let i = 0; i < a.length; i++) {
    let found = -1
    const prefer = Math.min(i, b.length - 1)
    for (const d of [0, 1, -1, 2, -2, 3, -3]) {
      const j = prefer + d
      if (j >= 0 && j < b.length && unused[j] && equals(a[i], b[j])) {
        found = j
        break
      }
    }
    if (found < 0) {
      for (let j = 0; j < b.length; j++) {
        if (unused[j] && equals(a[i], b[j])) {
          found = j
          break
        }
      }
    }
    if (found < 0) {
      out.push({ kind: 'del', text: a[i] })
      continue
    }
    for (let j = 0; j < found; j++) {
      if (unused[j]) {
        out.push({ kind: 'ins', text: b[j] })
        unused[j] = false
      }
    }
    out.push({ kind: 'keep', text: a[i] })
    unused[found] = false
  }
  for (let j = 0; j < b.length; j++) {
    if (unused[j]) out.push({ kind: 'ins', text: b[j] })
  }
  return out
}

export const myersAlgorithm: Algorithm = {
  id: 'myers',
  label: 'Myers / SES',
  diff: myersSes,
}
