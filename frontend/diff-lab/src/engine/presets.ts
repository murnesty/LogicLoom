import type { Detection, DiffOp, DiffOptions, EqualsFn } from './types'
import { registerPreset, runPreset } from './registry'
import { leadingWsEqual, splitLines, tokenizeWords } from './tokens'
import { flattenJson, flattenXml, tryParseJson, tryParseXml } from './flatten'
import { recommend } from './detect'
import { tryPretty, shouldWordRefineLine } from './pretty'
import { normalizeOptions, runAlgo } from './algoRegistry'

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

function refineAdjacentLineEdits(
  ses: DiffOp[],
  eq: EqualsFn,
  fine: string
): DiffOp[] {
  const ops: DiffOp[] = []
  for (let i = 0; i < ses.length; i++) {
    const cur = ses[i]
    const next = i + 1 < ses.length ? ses[i + 1] : null
    let oldL: string | null = null
    let newL: string | null = null
    if (cur.kind === 'del' && next?.kind === 'ins') {
      oldL = cur.text
      newL = next.text
    } else if (cur.kind === 'ins' && next?.kind === 'del') {
      newL = cur.text
      oldL = next.text
    }
    if (
      oldL !== null &&
      newL !== null &&
      oldL.length > 0 &&
      newL.length > 0 &&
      !eq(oldL, newL)
    ) {
      if (shouldWordRefineLine(oldL, newL)) {
        ops.push({ kind: 'hdr', text: `~ modified line [${fine}]` })
        ops.push(...wordRefineOps(oldL, newL, fine))
      } else {
        // Keep as separate lines so long XML tags stay readable after pretty
        ops.push({ kind: 'del', text: oldL })
        ops.push({ kind: 'ins', text: newL })
      }
      i++
      continue
    }
    ops.push(cur)
  }
  return ops
}

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

function lineThenWord(
  a: string,
  b: string,
  ignoreLeadingWs: boolean,
  options: DiffOptions
): DiffOp[] {
  const opts = normalizeOptions(options)
  const la = splitLines(a)
  const lb = splitLines(b)
  const eq: EqualsFn = ignoreLeadingWs ? leadingWsEqual : (x, y) => x === y
  const ses = runAlgo(opts.coarse, la, lb, eq)
  return refineAdjacentLineEdits(ses, eq, opts.fine)
}

function structuredOrText(
  a: string,
  b: string,
  d: Detection,
  options: DiffOptions
): DiffOp[] {
  const opts = normalizeOptions(options)
  try {
    if (d.kind === 'json' || (tryParseJson(a) && tryParseJson(b))) {
      const ops: DiffOp[] = [
        { kind: 'hdr', text: `[structured JSON paths · coarse=${opts.coarse}]` },
      ]
      ops.push(
        ...refineSamePathEdits(
          runAlgo(opts.coarse, flattenJson(a), flattenJson(b)),
          opts.fine
        )
      )
      return ops
    }
    if (d.kind === 'xml' || (tryParseXml(a) && tryParseXml(b))) {
      const ops: DiffOp[] = [
        { kind: 'hdr', text: `[structured XML paths · coarse=${opts.coarse}]` },
      ]
      ops.push(
        ...refineSamePathEdits(
          runAlgo(opts.coarse, flattenXml(a), flattenXml(b)),
          opts.fine
        )
      )
      return ops
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return [
      { kind: 'hdr', text: `[structured failed: ${msg} → text]` },
      ...lineThenWord(a, b, false, opts),
    ]
  }
  return [
    { kind: 'hdr', text: '[structured unavailable → text]' },
    ...lineThenWord(a, b, false, opts),
  ]
}

function prettyThenText(a: string, b: string, options: DiffOptions): DiffOp[] {
  const opts = normalizeOptions(options)
  const pa = tryPretty(a)
  const pb = tryPretty(b)
  const ops: DiffOp[] = []
  const notes = [pa.note, pb.note].filter(Boolean)
  if (notes.length > 0) {
    ops.push({
      kind: 'hdr',
      text: `[pretty] ${[...new Set(notes)].join('; ')} → coarse=${opts.coarse} fine=${opts.fine}`,
    })
  } else {
    ops.push({ kind: 'hdr', text: '[pretty] not JSON/XML — raw text' })
  }
  ops.push(...lineThenWord(pa.text, pb.text, false, opts))
  return ops
}

export function registerBuiltinPresets(): void {
  registerPreset({
    id: 'strict',
    label: 'exact whole-line only (no word refine)',
    run: (a, b, _d, options) => {
      const opts = normalizeOptions(options)
      return [
        { kind: 'hdr', text: `[strict · ${opts.coarse}]` },
        ...runAlgo(opts.coarse, splitLines(a), splitLines(b)),
      ]
    },
  })
  registerPreset({
    id: 'text',
    label: 'lines + word refine on modified lines',
    run: (a, b, _d, options) => lineThenWord(a, b, false, options),
  })
  registerPreset({
    id: 'ignore-ws',
    label: 'ignore leading spaces, then word refine',
    run: (a, b, _d, options) => lineThenWord(a, b, true, options),
  })
  registerPreset({
    id: 'pretty',
    label: 'prettify XML/JSON then text diff',
    run: (a, b, _d, options) => prettyThenText(a, b, options),
  })
  registerPreset({
    id: 'structured',
    label: 'JSON/XML path flatten + refine',
    run: structuredOrText,
  })
  registerPreset({
    id: 'recommended',
    label: 'auto (rules)',
    run: (a, b, d, options) => {
      const { id } = recommend(d)
      if (id === 'recommended') return lineThenWord(a, b, false, options)
      return runPreset(id, a, b, d, options)
    },
  })
}

registerBuiltinPresets()
