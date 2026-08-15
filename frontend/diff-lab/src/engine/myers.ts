import type { Algorithm, DiffOp, EqualsFn } from './types'

const defaultEq: EqualsFn = (x, y) => x === y

/**
 * Myers shortest edit script — true O(ND) time / O(ND) trace memory.
 * (Previously mislabeled Wagner–Fischer O(NM) matrices that OOM on big OOXML.)
 */
export function myersSes(
  a: string[],
  b: string[],
  equals: EqualsFn = defaultEq
): DiffOp[] {
  if (a.length === 0 && b.length === 0) return []

  // Fast path: fully identical (common for same DOCX uploaded twice)
  if (a.length === b.length) {
    let same = true
    for (let i = 0; i < a.length; i++) {
      if (!equals(a[i], b[i])) {
        same = false
        break
      }
    }
    if (same) return a.map((text) => ({ kind: 'keep' as const, text }))
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

  if (midA.length === 0 && midB.length === 0) return [...prefix, ...suffix]
  if (midA.length === 0) {
    return [
      ...prefix,
      ...midB.map((text) => ({ kind: 'ins' as const, text })),
      ...suffix,
    ]
  }
  if (midB.length === 0) {
    return [
      ...prefix,
      ...midA.map((text) => ({ kind: 'del' as const, text })),
      ...suffix,
    ]
  }

  return [...prefix, ...myersCore(midA, midB, equals), ...suffix]
}

function myersCore(a: string[], b: string[], equals: EqualsFn): DiffOp[] {
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

  type Edit = { kind: 'keep' | 'del' | 'ins'; text: string }
  const edits: Edit[] = []
  let x = n
  let y = m

  for (let d = foundD; d > 0; d--) {
    const vPrev = trace[d - 1]
    const k = x - y
    let prevK: number
    if (k === -d || (k !== d && vPrev[k - 1 + offset] < vPrev[k + 1 + offset])) {
      prevK = k + 1
    } else {
      prevK = k - 1
    }
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

export const myersAlgorithm: Algorithm = {
  id: 'myers',
  label: 'Myers / SES',
  diff: myersSes,
}
