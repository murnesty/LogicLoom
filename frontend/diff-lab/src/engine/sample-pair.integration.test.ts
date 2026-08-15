/**
 * Integration: every .docx in OriginalDoc vs TrunkDnldDoc through Diff Lab engine.
 * Skip if folders missing. Must pass before deploy when samples are present.
 */
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, existsSync, statSync } from 'fs'
import { join } from 'path'
import {
  loadZipPathsFromBuffer,
  readZipEntryFromBuffer,
  detect,
  runPreset,
  DEFAULT_DIFF_OPTIONS,
} from './index'
import type { DiffOp } from './types'

const ORIG_DIR =
  'C:/Users/kiwi/Documents/SampleDocuments/FieldCodes/OriginalDoc'
const TRUNK_DIR =
  'C:/Users/kiwi/Documents/SampleDocuments/FieldCodes/TrunkDnldDoc'

const foldersPresent = existsSync(ORIG_DIR) && existsSync(TRUNK_DIR)

function toArrayBuffer(buf: Buffer): ArrayBuffer {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
}

/** Normalize names so "Foo-original.docx" pairs with "Foo.docx". */
export function normalizeDocxKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/\.docx$/i, '')
    .replace(/\s*\(\d+\)\s*$/g, '')
    .replace(/-original$/i, '')
    .replace(/_original$/i, '')
    .replace(/\s*\(ori\)\s*/gi, '')
    .replace(/-ori$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function pairSampleDocx(
  origNames: string[],
  trunkNames: string[]
): { key: string; orig: string; trunk: string }[] {
  const origDocx = origNames.filter((n) => n.toLowerCase().endsWith('.docx'))
  const trunkDocx = trunkNames.filter((n) => n.toLowerCase().endsWith('.docx'))

  const trunkByKey = new Map<string, string[]>()
  for (const t of trunkDocx) {
    const k = normalizeDocxKey(t)
    const list = trunkByKey.get(k) ?? []
    list.push(t)
    trunkByKey.set(k, list)
  }

  const usedTrunk = new Set<string>()
  const pairs: { key: string; orig: string; trunk: string }[] = []

  // Prefer exact filename match
  for (const o of origDocx) {
    if (trunkDocx.includes(o) && !usedTrunk.has(o)) {
      pairs.push({ key: normalizeDocxKey(o), orig: o, trunk: o })
      usedTrunk.add(o)
    }
  }

  for (const o of origDocx) {
    if (pairs.some((p) => p.orig === o)) continue
    const k = normalizeDocxKey(o)
    const cands = (trunkByKey.get(k) ?? []).filter((t) => !usedTrunk.has(t))
    if (cands.length === 0) continue
    // Prefer shortest name (stripped -original)
    cands.sort((a, b) => a.length - b.length)
    const t = cands[0]
    pairs.push({ key: k, orig: o, trunk: t })
    usedTrunk.add(t)
  }

  return pairs
}

type PairResult = {
  orig: string
  trunk: string
  ms: number
  linesA: number
  linesB: number
  opCount: number
  editCount: number
  identical: boolean
  aborted: boolean
  error?: string
}

async function diffPair(origName: string, trunkName: string): Promise<PairResult> {
  const t0 = Date.now()
  const base: PairResult = {
    orig: origName,
    trunk: trunkName,
    ms: 0,
    linesA: 0,
    linesB: 0,
    opCount: 0,
    editCount: 0,
    identical: false,
    aborted: false,
  }
  try {
    const ab = toArrayBuffer(readFileSync(join(ORIG_DIR, origName)))
    const bb = toArrayBuffer(readFileSync(join(TRUNK_DIR, trunkName)))
    const textA = await readZipEntryFromBuffer(ab, 'word/document.xml')
    const textB = await readZipEntryFromBuffer(bb, 'word/document.xml')
    if (textA == null || textB == null) {
      return {
        ...base,
        ms: Date.now() - t0,
        error: 'missing word/document.xml on one side',
      }
    }

    const d = detect('word/document.xml', 'word/document.xml', textA, textB)
    const ops: DiffOp[] = runPreset('pretty', textA, textB, d, {
      ...DEFAULT_DIFF_OPTIONS,
      coarse: 'myers',
      sortAttrs: true,
      ignoreOoxmlIds: true,
    })

    const hdr = ops.filter((o) => o.kind === 'hdr').map((o) => o.text).join(' | ')
    const identical =
      hdr.includes('identical') ||
      ops.every((o) => o.kind === 'hdr' || o.kind === 'keep')
    const aborted = hdr.includes('abort') || hdr.includes('too many lines')
    // "large result … omitted" is OK — not a hard abort
    const hardAbort = aborted && !hdr.includes('large result')
    const editCount = ops.filter((o) => o.kind === 'del' || o.kind === 'ins').length

    // Rough line counts from pretty notes if present
    const lineNote = hdr.match(/(\d+)\s*→\s*(\d+)\s*lines/)
    return {
      ...base,
      ms: Date.now() - t0,
      linesA: lineNote ? Number(lineNote[2]) : 0,
      linesB: 0,
      opCount: ops.length,
      editCount,
      identical: identical && editCount === 0,
      aborted: hardAbort,
    }
  } catch (e) {
    return {
      ...base,
      ms: Date.now() - t0,
      error: e instanceof Error ? e.message : String(e),
    }
  }
}

describe('SampleDocuments OriginalDoc ↔ TrunkDnldDoc', () => {
  it.skipIf(!foldersPresent)('pairs every .docx by normalized name', () => {
    const orig = readdirSync(ORIG_DIR)
    const trunk = readdirSync(TRUNK_DIR)
    const pairs = pairSampleDocx(orig, trunk)
    expect(pairs.length).toBeGreaterThan(10)
    // Clinical Overview must be paired (known OOM case)
    expect(
      pairs.some(
        (p) =>
          p.orig.toLowerCase().includes('clinical overview') &&
          p.trunk.toLowerCase().includes('clinical overview')
      )
    ).toBe(true)
  })

  it.skipIf(!foldersPresent)(
    'pretty+myers diffs each pair without OOM/throw (≤90s each)',
    async () => {
      const pairs = pairSampleDocx(readdirSync(ORIG_DIR), readdirSync(TRUNK_DIR))
      const results: PairResult[] = []

      for (const p of pairs) {
        const sizeA = statSync(join(ORIG_DIR, p.orig)).size
        const sizeB = statSync(join(TRUNK_DIR, p.trunk)).size
        // Soft skip absurd archives (>25MB) to keep CI laptop friendly
        if (sizeA > 25_000_000 || sizeB > 25_000_000) {
          results.push({
            orig: p.orig,
            trunk: p.trunk,
            ms: 0,
            linesA: 0,
            linesB: 0,
            opCount: 0,
            editCount: 0,
            identical: false,
            aborted: true,
            error: `skipped large archive (${sizeA}/${sizeB} bytes)`,
          })
          continue
        }

        const r = await diffPair(p.orig, p.trunk)
        results.push(r)
        // Fail fast on allocation / hard errors
        if (r.error && !r.error.startsWith('missing') && !r.error.startsWith('skipped')) {
          expect.fail(`${p.orig} ↔ ${p.trunk}: ${r.error} (${r.ms}ms)`)
        }
        expect(r.ms).toBeLessThan(90_000)
      }

      const failed = results.filter(
        (r) =>
          r.error &&
          !r.error.startsWith('missing') &&
          !r.error.startsWith('skipped')
      )
      const table = results
        .map(
          (r) =>
            `${r.ms.toString().padStart(6)}ms  edits=${String(r.editCount).padStart(5)}  ${r.error ? 'ERR ' + r.error : r.aborted ? 'ABORT' : r.identical ? 'same' : 'diff'}  ${r.orig} ↔ ${r.trunk}`
        )
        .join('\n')
      // Visible in vitest reporter
      console.log('\n=== Sample pair results ===\n' + table + '\n')

      expect(failed, `failures:\n${failed.map((f) => f.error).join('\n')}`).toEqual(
        []
      )
      const aborted = results.filter((r) => r.aborted && !r.error)
      expect(
        aborted,
        `unexpected aborts:\n${aborted.map((a) => a.orig).join('\n')}`
      ).toEqual([])
      expect(results.some((r) => !r.error || r.error.startsWith('skipped'))).toBe(
        true
      )
    },
    600_000
  )

  it.skipIf(!foldersPresent)(
    'Clinical Overview (known OOM) completes under 60s',
    async () => {
      const pairs = pairSampleDocx(readdirSync(ORIG_DIR), readdirSync(TRUNK_DIR))
      const clinical = pairs.find((p) =>
        p.orig.toLowerCase().includes('clinical overview')
      )
      expect(clinical).toBeTruthy()
      const r = await diffPair(clinical!.orig, clinical!.trunk)
      expect(r.error).toBeUndefined()
      expect(r.aborted).toBe(false)
      expect(r.ms).toBeLessThan(60_000)
      expect(r.opCount).toBeGreaterThan(0)
    },
    90_000
  )

  it.skipIf(!foldersPresent)('7348 sample still lists document.xml', async () => {
    const aPath = join(ORIG_DIR, '7348_SampleDocument.docx')
    const bPath = join(TRUNK_DIR, '7348_SampleDocument.docx')
    expect(existsSync(aPath) && existsSync(bPath)).toBe(true)
    const ab = toArrayBuffer(readFileSync(aPath))
    const paths = await loadZipPathsFromBuffer(ab)
    expect(paths.some((p) => p.replace(/\\/g, '/') === 'word/document.xml')).toBe(
      true
    )
  })
})

describe('pairSampleDocx unit', () => {
  it('matches -original to stripped trunk name', () => {
    const pairs = pairSampleDocx(
      ['Field Codes-WORD-original.docx', 'Clinical Overview-original.docx'],
      ['Field Codes-WORD.docx', 'Clinical Overview-original.docx']
    )
    expect(pairs).toEqual([
      {
        key: 'clinical overview',
        orig: 'Clinical Overview-original.docx',
        trunk: 'Clinical Overview-original.docx',
      },
      {
        key: 'field codes-word',
        orig: 'Field Codes-WORD-original.docx',
        trunk: 'Field Codes-WORD.docx',
      },
    ])
  })
})
