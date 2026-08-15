import type { Algorithm, DiffOp } from './types'
import { registerAlgorithm } from './registry'

const defaultEq = (x: string, y: string) => x === y

/** Myers shortest edit script via DP (port of DiffCli). */
export function myersSes(
  a: string[],
  b: string[],
  equals: (x: string, y: string) => boolean = defaultEq
): DiffOp[] {
  const n = a.length
  const m = b.length
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0))
  const ch: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0))

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
      if (equals(a[i - 1], b[j - 1])) {
        dp[i][j] = dp[i - 1][j - 1]
        ch[i][j] = 1
      } else if (dp[i - 1][j] <= dp[i][j - 1]) {
        dp[i][j] = dp[i - 1][j] + 1
        ch[i][j] = 2
      } else {
        dp[i][j] = dp[i][j - 1] + 1
        ch[i][j] = 3
      }
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
  ops.reverse()
  return ops
}

export const myersAlgorithm: Algorithm = { id: 'myers', diff: myersSes }

registerAlgorithm(myersAlgorithm)
