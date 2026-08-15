import type { DiffOp, EqualsFn } from './types'
import { myersSes } from './myers'

const defaultEq: EqualsFn = (x, y) => x === y

/** Soft cap: JS number[][] cells blow RAM (~tens of bytes each). */
const MAX_DP_CELLS = 4_000_000

function tooBigForDp(n: number, m: number): boolean {
  return (n + 1) * (m + 1) > MAX_DP_CELLS
}

function keyFn(equals: EqualsFn): (s: string) => string {
  // Custom equals (e.g. ignore leading WS): canonicalize for LCS/anchors
  if (equals === defaultEq) return (s) => s
  return (s) => s.trimStart()
}

/** Classic LCS align (pick closest-to-diagonal among a few variants). */
export function lcsSes(
  a: string[],
  b: string[],
  equals: EqualsFn = defaultEq
): DiffOp[] {
  const n = a.length
  const m = b.length
  if (tooBigForDp(n, m)) {
    return [
      {
        kind: 'hdr',
        text: `[lcs] ${n}×${m} too large for DP matrix — falling back to Myers`,
      },
      ...myersSes(a, b, equals),
    ]
  }
  const key = keyFn(equals)
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0))
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      dp[i][j] = equals(a[i - 1], b[j - 1])
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }

  const target = dp[n][m]
  const variants: string[][] = []
  const seen = new Set<string>()
  const MAX = 12

  function dfs(i: number, j: number, acc: string[]) {
    if (variants.length >= MAX) return
    if (i === 0 || j === 0) {
      const seq = acc.slice().reverse()
      const sig = seq.map(key).join('\0')
      if (seq.length === target && !seen.has(sig)) {
        seen.add(sig)
        variants.push(seq)
      }
      return
    }
    if (equals(a[i - 1], b[j - 1])) {
      acc.push(a[i - 1])
      dfs(i - 1, j - 1, acc)
      acc.pop()
      return
    }
    if (dp[i - 1][j] === dp[i][j]) dfs(i - 1, j, acc)
    if (dp[i][j - 1] === dp[i][j]) dfs(i, j - 1, acc)
  }
  dfs(n, m, [])

  let best = variants[0] ?? []
  if (variants.length > 1 && n && m) {
    let bestD = Infinity
    for (const v of variants) {
      const cells: { i: number; j: number }[] = []
      let ii = n
      let jj = m
      for (let k = v.length - 1; k >= 0; k--) {
        const tok = v[k]
        while (ii > 0 && !equals(a[ii - 1], tok)) ii--
        while (jj > 0 && !equals(b[jj - 1], tok)) jj--
        if (ii > 0 && jj > 0) {
          cells.push({ i: ii, j: jj })
          ii--
          jj--
        }
      }
      const d =
        cells.reduce((s, c) => s + Math.abs(c.i / n - c.j / m), 0) /
        Math.max(1, cells.length)
      if (d < bestD) {
        bestD = d
        best = v
      }
    }
  }

  const ops: DiffOp[] = []
  let i = 0
  let j = 0
  for (const tok of best) {
    while (i < a.length && !equals(a[i], tok)) {
      ops.push({ kind: 'del', text: a[i++] })
    }
    while (j < b.length && !equals(b[j], tok)) {
      ops.push({ kind: 'ins', text: b[j++] })
    }
    ops.push({ kind: 'keep', text: a[i] })
    i++
    j++
  }
  while (i < a.length) ops.push({ kind: 'del', text: a[i++] })
  while (j < b.length) ops.push({ kind: 'ins', text: b[j++] })
  return ops
}

/** Wagner–Fischer; substitute → del+ins pair. */
export function levenshteinSes(
  a: string[],
  b: string[],
  equals: EqualsFn = defaultEq
): DiffOp[] {
  const n = a.length
  const m = b.length
  if (tooBigForDp(n, m)) {
    return [
      {
        kind: 'hdr',
        text: `[levenshtein] ${n}×${m} too large for DP matrix — falling back to Myers`,
      },
      ...myersSes(a, b, equals),
    ]
  }
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0))
  const ch: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0))
  // 1=eq 2=del 3=ins 4=sub
  for (let i = 1; i <= n; i++) {
    dp[i][0] = i
    ch[i][0] = 2
  }
  for (let j = 1; j <= m; j++) {
    dp[0][j] = j
    ch[0][j] = 3
  }
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const subCost = equals(a[i - 1], b[j - 1]) ? 0 : 1
      const del = dp[i - 1][j] + 1
      const ins = dp[i][j - 1] + 1
      const sub = dp[i - 1][j - 1] + subCost
      const best = Math.min(del, ins, sub)
      dp[i][j] = best
      if (best === sub) ch[i][j] = subCost ? 4 : 1
      else if (best === del) ch[i][j] = 2
      else ch[i][j] = 3
    }
  }
  const ops: DiffOp[] = []
  let i = n
  let j = m
  while (i > 0 || j > 0) {
    const c = ch[i][j]
    if (c === 1) {
      ops.push({ kind: 'keep', text: a[i - 1] })
      i--
      j--
    } else if (c === 4) {
      ops.push({ kind: 'ins', text: b[j - 1] })
      ops.push({ kind: 'del', text: a[i - 1] })
      i--
      j--
    } else if (c === 2) {
      ops.push({ kind: 'del', text: a[i - 1] })
      i--
    } else if (c === 3) {
      ops.push({ kind: 'ins', text: b[j - 1] })
      j--
    } else if (i > 0) {
      ops.push({ kind: 'del', text: a[i - 1] })
      i--
    } else {
      ops.push({ kind: 'ins', text: b[j - 1] })
      j--
    }
  }
  return ops.reverse()
}

function counts(arr: string[], equals: EqualsFn): Map<string, number> {
  const k = keyFn(equals)
  const m = new Map<string, number>()
  for (const L of arr) {
    const key = k(L)
    m.set(key, (m.get(key) ?? 0) + 1)
  }
  return m
}

function anchoredDiff(
  a: string[],
  b: string[],
  isAnchor: (line: string) => boolean,
  equals: EqualsFn
): DiffOp[] {
  const ax: string[] = []
  const aix: number[] = []
  const by: string[] = []
  const biy: number[] = []
  a.forEach((L, i) => {
    if (isAnchor(L)) {
      ax.push(L)
      aix.push(i)
    }
  })
  b.forEach((L, i) => {
    if (isAnchor(L)) {
      by.push(L)
      biy.push(i)
    }
  })
  if (!ax.length || !by.length) return myersSes(a, b, equals)

  const lcs = lcsSes(ax, by, equals)
  const pairs: { ai: number; bi: number }[] = []
  let i = 0
  let j = 0
  for (const op of lcs) {
    if (op.kind !== 'keep') continue
    while (i < ax.length && !equals(ax[i], op.text)) i++
    while (j < by.length && !equals(by[j], op.text)) j++
    if (i < ax.length && j < by.length) {
      pairs.push({ ai: aix[i], bi: biy[j] })
      i++
      j++
    }
  }

  const ops: DiffOp[] = []
  let ai = 0
  let bi = 0
  for (const p of pairs) {
    ops.push(...myersSes(a.slice(ai, p.ai), b.slice(bi, p.bi), equals))
    ops.push({ kind: 'keep', text: a[p.ai] })
    ai = p.ai + 1
    bi = p.bi + 1
  }
  ops.push(...myersSes(a.slice(ai), b.slice(bi), equals))
  return ops
}

export function patienceSes(
  a: string[],
  b: string[],
  equals: EqualsFn = defaultEq
): DiffOp[] {
  const cx = counts(a, equals)
  const cy = counts(b, equals)
  const k = keyFn(equals)
  return anchoredDiff(
    a,
    b,
    (L) => cx.get(k(L)) === 1 && cy.get(k(L)) === 1,
    equals
  )
}

export function histogramSes(
  a: string[],
  b: string[],
  equals: EqualsFn = defaultEq
): DiffOp[] {
  const cx = counts(a, equals)
  const cy = counts(b, equals)
  const k = keyFn(equals)
  let thr = 1
  let last: DiffOp[] | null = null
  while (thr <= 32) {
    const ops = anchoredDiff(
      a,
      b,
      (L) => {
        const key = k(L)
        const x = cx.get(key) ?? 0
        const y = cy.get(key) ?? 0
        return x > 0 && y > 0 && Math.max(x, y) <= thr
      },
      equals
    )
    last = ops
    const hasAnchor = a.some((L) => {
      const key = k(L)
      const x = cx.get(key) ?? 0
      const y = cy.get(key) ?? 0
      return x > 0 && y > 0 && Math.max(x, y) <= thr
    })
    if (hasAnchor && ops.some((o) => o.kind === 'keep')) return ops
    thr++
  }
  return last ?? myersSes(a, b, equals)
}
