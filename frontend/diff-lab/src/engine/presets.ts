import type { Detection, DiffOp, DiffOptions, EqualsFn } from './types'
import { registerPreset, runPreset } from './registry'
import { leadingWsEqual, splitLines, tokenizeWords } from './tokens'
import { tryParseJson, tryParseXml } from './flatten'
import { recommend } from './detect'
import { tryPretty, shouldWordRefineLine } from './pretty'
import { normalizeOptions, runAlgo } from './algoRegistry'
import { runStructure } from './structural'

export { pathKey, refineSamePathEdits } from './pathRefine'

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
        // Terminates the inline token group in DiffResult (see groupOps).
        ops.push({ kind: 'hdr', text: '~.' })
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

function lineThenWord(
  a: string,
  b: string,
  ignoreLeadingWs: boolean,
  options: DiffOptions,
  /** When false, keep whole-line −/+ only (pretty XML/JSON). */
  refineWords = true
): DiffOp[] {
  const opts = normalizeOptions(options)
  const la = splitLines(a)
  const lb = splitLines(b)
  const eq: EqualsFn = ignoreLeadingWs ? leadingWsEqual : (x, y) => x === y
  const ses = runAlgo(opts.coarse, la, lb, eq)
  if (!refineWords) return ses
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
      return runStructure('json', a, b, opts.structure, opts.coarse, opts.fine)
    }
    if (d.kind === 'xml' || (tryParseXml(a) && tryParseXml(b))) {
      return runStructure('xml', a, b, opts.structure, opts.coarse, opts.fine)
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
      text: `[pretty] ${[...new Set(notes)].join('; ')} → coarse=${opts.coarse} · line-only (no word refine)`,
    })
  } else {
    ops.push({ kind: 'hdr', text: '[pretty] not JSON/XML — raw text' })
  }
  // One prettified line = one diff row. Word-refine was smashing many XML lines
  // into a single “modified” block in the UI.
  ops.push(...lineThenWord(pa.text, pb.text, false, opts, false))
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
