import type { Algorithm, DiffOp, EqualsFn } from './types'

const defaultEq: EqualsFn = (x, y) => x === y

/** Above this, emit a summary keep-header instead of N keep ops (DOM/RAM). */
const IDENTICAL_EXPAND_MAX = 4_000

/** Windows larger than this use anchor split instead of one Myers pass. */
const MYERS_DIRECT_MAX = 4_000

/**
 * Myers SES — linear space via middle-snake divide & conquer.
 * (No per-d Int32Array.from traces — those OOM on large OOXML.)
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

  const out: DiffOp[] = []
  diffRange(a, 0, a.length, b, 0, b.length, equals, out)
  return out
}

function diffRange(
  a: string[],
  a0: number,
  a1: number,
  b: string[],
  b0: number,
  b1: number,
  equals: EqualsFn,
  out: DiffOp[]
): void {
  // Common prefix
  while (a0 < a1 && b0 < b1 && equals(a[a0], b[b0])) {
    out.push({ kind: 'keep', text: a[a0] })
    a0++
    b0++
  }

  // Common suffix (remember, emit after middle)
  let sA = 0
  let sB = 0
  while (a0 < a1 - sA && b0 < b1 - sB && equals(a[a1 - 1 - sA], b[b1 - 1 - sB])) {
    sA++
    sB++
  }
  const aEnd = a1 - sA
  const bEnd = b1 - sB

  const n = aEnd - a0
  const m = bEnd - b0

  if (n > 0 && m > 0) {
    if (n <= MYERS_DIRECT_MAX && m <= MYERS_DIRECT_MAX) {
      const snake = middleSnake(a, a0, aEnd, b, b0, bEnd, equals)
      if (snake.x === 0 && snake.y === 0 && snake.u === 0 && snake.v === 0) {
        // empty snake at origin — force progress
        if (n > m) {
          out.push({ kind: 'del', text: a[a0] })
          diffRange(a, a0 + 1, aEnd, b, b0, bEnd, equals, out)
        } else {
          out.push({ kind: 'ins', text: b[b0] })
          diffRange(a, a0, aEnd, b, b0 + 1, bEnd, equals, out)
        }
      } else {
        diffRange(a, a0, a0 + snake.x, b, b0, b0 + snake.y, equals, out)
        for (let i = snake.x; i < snake.u; i++) {
          out.push({ kind: 'keep', text: a[a0 + i] })
        }
        diffRange(a, a0 + snake.u, aEnd, b, b0 + snake.v, bEnd, equals, out)
      }
      } else {
        // Large pocket: split on a unique shared line, else greedy align
        const split = findAnchorSplit(a, a0, aEnd, b, b0, bEnd, equals)
        if (split) {
          diffRange(a, a0, split.ai, b, b0, split.bi, equals, out)
          out.push({ kind: 'keep', text: a[split.ai] })
          diffRange(a, split.ai + 1, aEnd, b, split.bi + 1, bEnd, equals, out)
        } else {
          greedyAlign(a, a0, aEnd, b, b0, bEnd, equals, out)
        }
      }
  } else if (n > 0) {
    for (let i = a0; i < aEnd; i++) out.push({ kind: 'del', text: a[i] })
  } else if (m > 0) {
    for (let j = b0; j < bEnd; j++) out.push({ kind: 'ins', text: b[j] })
  }

  for (let i = aEnd; i < a1; i++) out.push({ kind: 'keep', text: a[i] })
}

/** Greedy: for each a-line, keep if equals next b, else del; flush remaining b as ins. */
function greedyAlign(
  a: string[],
  a0: number,
  a1: number,
  b: string[],
  b0: number,
  b1: number,
  equals: EqualsFn,
  out: DiffOp[]
): void {
  // Index b lines for multiset matching
  const unused = new Array(b1 - b0).fill(true)
  const bAt = (j: number) => b[b0 + j]

  for (let i = a0; i < a1; i++) {
    let found = -1
    // Prefer nearby match
    const prefer = Math.min(i - a0, unused.length - 1)
    for (const delta of [0, 1, -1, 2, -2]) {
      const j = prefer + delta
      if (j >= 0 && j < unused.length && unused[j] && equals(a[i], bAt(j))) {
        found = j
        break
      }
    }
    if (found < 0) {
      for (let j = 0; j < unused.length; j++) {
        if (unused[j] && equals(a[i], bAt(j))) {
          found = j
          break
        }
      }
    }
    if (found < 0) {
      out.push({ kind: 'del', text: a[i] })
    } else {
      // insert skipped b lines before this match
      for (let j = 0; j < found; j++) {
        if (unused[j]) {
          out.push({ kind: 'ins', text: bAt(j) })
          unused[j] = false
        }
      }
      out.push({ kind: 'keep', text: a[i] })
      unused[found] = false
    }
  }
  for (let j = 0; j < unused.length; j++) {
    if (unused[j]) out.push({ kind: 'ins', text: bAt(j) })
  }
}

function findAnchorSplit(
  a: string[],
  a0: number,
  a1: number,
  b: string[],
  b0: number,
  b1: number,
  equals: EqualsFn
): { ai: number; bi: number } | null {
  const countA = new Map<string, number>()
  const countB = new Map<string, number>()
  for (let i = a0; i < a1; i++) {
    const k = a[i]
    countA.set(k, (countA.get(k) ?? 0) + 1)
  }
  for (let j = b0; j < b1; j++) {
    const k = b[j]
    countB.set(k, (countB.get(k) ?? 0) + 1)
  }
  // Prefer unique lines in both, near the middle
  const mid = a0 + Math.floor((a1 - a0) / 2)
  let best: { ai: number; bi: number; dist: number } | null = null
  for (let i = a0; i < a1; i++) {
    const line = a[i]
    if ((countA.get(line) ?? 0) !== 1) continue
    if ((countB.get(line) ?? 0) !== 1) continue
    // find in b
    let bi = -1
    for (let j = b0; j < b1; j++) {
      if (equals(b[j], line)) {
        bi = j
        break
      }
    }
    if (bi < 0) continue
    const dist = Math.abs(i - mid)
    if (!best || dist < best.dist) best = { ai: i, bi, dist }
  }
  return best ? { ai: best.ai, bi: best.bi } : null
}

/**
 * Middle snake for a[a0,a1) × b[b0,b1). Only two V buffers (O(N+M) memory).
 */
function middleSnake(
  a: string[],
  a0: number,
  a1: number,
  b: string[],
  b0: number,
  b1: number,
  equals: EqualsFn
): { x: number; y: number; u: number; v: number } {
  const n = a1 - a0
  const m = b1 - b0
  const max = n + m
  const off = max
  const vf = new Int32Array(2 * max + 2)
  const vb = new Int32Array(2 * max + 2)
  const delta = n - m

  for (let d = 0; d <= Math.ceil(max / 2); d++) {
    // Forward search
    for (let k = -d; k <= d; k += 2) {
      let x =
        k === -d || (k !== d && vf[k - 1 + off] < vf[k + 1 + off])
          ? vf[k + 1 + off]
          : vf[k - 1 + off] + 1
      let y = x - k
      const x0 = x
      const y0 = y
      while (x < n && y < m && equals(a[a0 + x], b[b0 + y])) {
        x++
        y++
      }
      vf[k + off] = x

      if (delta % 2 !== 0 && k >= delta - (d - 1) && k <= delta + (d - 1)) {
        if (x + vb[delta - k + off] >= n) {
          return { x: x0, y: y0, u: x, v: y }
        }
      }
    }

    // Reverse search
    for (let k = -d; k <= d; k += 2) {
      let x =
        k === -d || (k !== d && vb[k - 1 + off] < vb[k + 1 + off])
          ? vb[k + 1 + off]
          : vb[k - 1 + off] + 1
      let y = x - k
      const x0 = x
      const y0 = y
      while (x < n && y < m && equals(a[a1 - x - 1], b[b1 - y - 1])) {
        x++
        y++
      }
      vb[k + off] = x

      if (delta % 2 === 0 && k >= delta - d && k <= delta + d) {
        if (vf[delta - k + off] + x >= n) {
          return { x: n - x, y: m - y, u: n - x0, v: m - y0 }
        }
      }
    }
  }

  return { x: 0, y: 0, u: 0, v: 0 }
}

export const myersAlgorithm: Algorithm = {
  id: 'myers',
  label: 'Myers / SES',
  diff: myersSes,
}
