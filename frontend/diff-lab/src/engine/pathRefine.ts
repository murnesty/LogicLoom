import type { DiffOp } from './types'
import { tokenizeWords } from './tokens'
import { shouldWordRefineLine } from './pretty'
import { runAlgo } from './algoRegistry'

/** Path key for flattened lines: everything before first ` = `. */
export function pathKey(line: string): string {
  const i = line.indexOf(' = ')
  return i >= 0 ? line.slice(0, i) : line
}

function wordRefineOps(oldL: string, newL: string, fine: string): DiffOp[] {
  return runAlgo(fine, tokenizeWords(oldL), tokenizeWords(newL)).map((w) => ({
    kind: w.kind,
    text: w.text.replace(/\n/g, '⏎'),
  }))
}

/** Pair del/ins that share the same path key and word-refine the value. */
export function refineSamePathEdits(ses: DiffOp[], fine = 'myers'): DiffOp[] {
  const used = new Set<number>()
  const byKey = new Map<string, { dels: number[]; ins: number[] }>()

  for (let i = 0; i < ses.length; i++) {
    const op = ses[i]
    if (op.kind !== 'del' && op.kind !== 'ins') continue
    const k = pathKey(op.text)
    let bucket = byKey.get(k)
    if (!bucket) {
      bucket = { dels: [], ins: [] }
      byKey.set(k, bucket)
    }
    if (op.kind === 'del') bucket.dels.push(i)
    else bucket.ins.push(i)
  }

  const pairOf = new Map<number, number>()
  for (const bucket of byKey.values()) {
    const n = Math.min(bucket.dels.length, bucket.ins.length)
    for (let p = 0; p < n; p++) {
      const di = bucket.dels[p]
      const ii = bucket.ins[p]
      if (ses[di].text === ses[ii].text) continue
      pairOf.set(di, ii)
      pairOf.set(ii, di)
    }
  }

  const ops: DiffOp[] = []
  for (let i = 0; i < ses.length; i++) {
    if (used.has(i)) continue
    const op = ses[i]
    const partner = pairOf.get(i)
    if (partner !== undefined && (op.kind === 'del' || op.kind === 'ins')) {
      used.add(i)
      used.add(partner)
      const delOp = op.kind === 'del' ? op : ses[partner]
      const insOp = op.kind === 'ins' ? op : ses[partner]
      const key = pathKey(delOp.text)
      if (shouldWordRefineLine(delOp.text, insOp.text)) {
        ops.push({ kind: 'hdr', text: `~ modified ${key} [${fine}]` })
        ops.push(...wordRefineOps(delOp.text, insOp.text, fine))
        ops.push({ kind: 'hdr', text: '~.' })
      } else {
        ops.push({ kind: 'del', text: delOp.text })
        ops.push({ kind: 'ins', text: insOp.text })
      }
      continue
    }
    ops.push(op)
  }
  return ops
}
