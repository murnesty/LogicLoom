import type { Detection, DiffOp } from './types'
import { registerPreset, runPreset } from './registry'
import { myersSes } from './myers'
import { leadingWsEqual, splitLines, tokenizeWords } from './tokens'
import { flattenJson, flattenXml, tryParseJson, tryParseXml } from './flatten'
import { recommend } from './detect'
import { tryPretty } from './pretty'

/** Path key for flattened lines: everything before first ` = `. */
export function pathKey(line: string): string {
  const i = line.indexOf(' = ')
  return i >= 0 ? line.slice(0, i) : line
}

function wordRefineOps(oldL: string, newL: string): DiffOp[] {
  return myersSes(tokenizeWords(oldL), tokenizeWords(newL)).map((w) => ({
    kind: w.kind,
    text: w.text.replace(/\n/g, '⏎'),
  }))
}

function lineThenWord(a: string, b: string, ignoreLeadingWs: boolean): DiffOp[] {
  const la = splitLines(a)
  const lb = splitLines(b)
  const eq = ignoreLeadingWs ? leadingWsEqual : (x: string, y: string) => x === y
  return refineAdjacentLineEdits(myersSes(la, lb, eq), eq)
}

/** Collapse adjacent del/ins (any lines) into modify + word Myers. */
function refineAdjacentLineEdits(
  ses: DiffOp[],
  eq: (x: string, y: string) => boolean
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
    if (oldL !== null && newL !== null && oldL.length > 0 && newL.length > 0 && !eq(oldL, newL)) {
      ops.push({ kind: 'hdr', text: '~ modified line' })
      ops.push(...wordRefineOps(oldL, newL))
      i++
      continue
    }
    ops.push(cur)
  }
  return ops
}

/**
 * For structured path lines: pair del+ins that share the same path key
 * (even if not adjacent), emit ~ modified + word Myers.
 */
export function refineSamePathEdits(ses: DiffOp[]): DiffOp[] {
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
      ops.push({ kind: 'hdr', text: `~ modified ${key}` })
      ops.push(...wordRefineOps(delOp.text, insOp.text))
      continue
    }
    ops.push(op)
  }
  return ops
}

function structuredOrText(a: string, b: string, d: Detection): DiffOp[] {
  try {
    if (d.kind === 'json' || (tryParseJson(a) && tryParseJson(b))) {
      const ops: DiffOp[] = [{ kind: 'hdr', text: '[structured JSON paths]' }]
      ops.push(...refineSamePathEdits(myersSes(flattenJson(a), flattenJson(b))))
      return ops
    }
    if (d.kind === 'xml' || (tryParseXml(a) && tryParseXml(b))) {
      const ops: DiffOp[] = [{ kind: 'hdr', text: '[structured XML paths]' }]
      ops.push(...refineSamePathEdits(myersSes(flattenXml(a), flattenXml(b))))
      return ops
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return [
      { kind: 'hdr', text: `[structured failed: ${msg} → text]` },
      ...lineThenWord(a, b, false),
    ]
  }
  return [
    { kind: 'hdr', text: '[structured unavailable → text]' },
    ...lineThenWord(a, b, false),
  ]
}

function prettyThenText(a: string, b: string): DiffOp[] {
  const pa = tryPretty(a)
  const pb = tryPretty(b)
  const ops: DiffOp[] = []
  const notes = [pa.note, pb.note].filter(Boolean)
  if (notes.length > 0) {
    ops.push({ kind: 'hdr', text: `[pretty] ${[...new Set(notes)].join('; ')} → text` })
  } else {
    ops.push({ kind: 'hdr', text: '[pretty] not JSON/XML — raw text' })
  }
  ops.push(...lineThenWord(pa.text, pb.text, false))
  return ops
}

export function registerBuiltinPresets(): void {
  registerPreset({
    id: 'strict',
    label: 'exact whole-line Myers only',
    run: (a, b) => myersSes(splitLines(a), splitLines(b)),
  })
  registerPreset({
    id: 'text',
    label: 'lines + word refine on modified lines',
    run: (a, b) => lineThenWord(a, b, false),
  })
  registerPreset({
    id: 'ignore-ws',
    label: 'ignore leading spaces, then word refine',
    run: (a, b) => lineThenWord(a, b, true),
  })
  registerPreset({
    id: 'pretty',
    label: 'prettify XML/JSON then text diff',
    run: (a, b) => prettyThenText(a, b),
  })
  registerPreset({
    id: 'structured',
    label: 'JSON/XML path flatten + Myers',
    run: structuredOrText,
  })
  registerPreset({
    id: 'recommended',
    label: 'auto (rules)',
    run: (a, b, d) => {
      const { id } = recommend(d)
      if (id === 'recommended') return lineThenWord(a, b, false)
      return runPreset(id, a, b, d)
    },
  })
}

registerBuiltinPresets()
