import type { Detection, DiffOp } from './types'
import { registerPreset, runPreset } from './registry'
import { myersSes } from './myers'
import { leadingWsEqual, splitLines, tokenizeWords } from './tokens'
import { flattenJson, flattenXml, tryParseJson, tryParseXml } from './flatten'
import { recommend } from './detect'

function lineThenWord(a: string, b: string, ignoreLeadingWs: boolean): DiffOp[] {
  const la = splitLines(a)
  const lb = splitLines(b)
  const eq = ignoreLeadingWs ? leadingWsEqual : (x: string, y: string) => x === y
  const ses = myersSes(la, lb, eq)
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
      for (const w of myersSes(tokenizeWords(oldL), tokenizeWords(newL))) {
        ops.push({ kind: w.kind, text: w.text.replace(/\n/g, '⏎') })
      }
      i++
      continue
    }
    ops.push(cur)
  }
  return ops
}

function structuredOrText(a: string, b: string, d: Detection): DiffOp[] {
  try {
    if (d.kind === 'json' || (tryParseJson(a) && tryParseJson(b))) {
      const ops: DiffOp[] = [{ kind: 'hdr', text: '[structured JSON paths]' }]
      ops.push(...myersSes(flattenJson(a), flattenJson(b)))
      return ops
    }
    if (d.kind === 'xml' || (tryParseXml(a) && tryParseXml(b))) {
      const ops: DiffOp[] = [{ kind: 'hdr', text: '[structured XML paths]' }]
      ops.push(...myersSes(flattenXml(a), flattenXml(b)))
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
