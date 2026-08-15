/**
 * Broader IT: every FieldCodes pair × algo grid.
 * Each cell runs in a child process and is SIGKILL'd after budgetMs (status=timeout).
 * Heavy combos skip when document.xml exceeds HEAVY_MAX_CHARS.
 */
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, existsSync, statSync } from 'fs'
import { join } from 'path'
import { readZipEntryFromBuffer } from './index'
import { pairSampleDocx } from './samplePairs'
import { runMatrixCellWithTimeout } from './matrixTimeout'

const ORIG_DIR =
  'C:/Users/kiwi/Documents/SampleDocuments/FieldCodes/OriginalDoc'
const TRUNK_DIR =
  'C:/Users/kiwi/Documents/SampleDocuments/FieldCodes/TrunkDnldDoc'

const foldersPresent = existsSync(ORIG_DIR) && existsSync(TRUNK_DIR)

/** Skip heavy SES/hash when either side’s document.xml exceeds this. */
const HEAVY_MAX_CHARS = 150_000

type Combo = {
  id: string
  preset: string
  coarse: string
  fine?: string
  structure?: string
  heavy?: boolean
  /** Hard kill budget for child process. */
  budgetMs: number
  /** Light combos: timeout fails the suite. */
  light?: boolean
}

const MATRIX: Combo[] = [
  {
    id: 'pretty/myers',
    preset: 'pretty',
    coarse: 'myers',
    budgetMs: 60_000,
    light: true,
  },
  {
    id: 'strict/myers',
    preset: 'strict',
    coarse: 'myers',
    budgetMs: 60_000,
    light: true,
  },
  {
    id: 'structured/path-key/myers',
    preset: 'structured',
    coarse: 'myers',
    structure: 'path-key',
    heavy: true,
    budgetMs: 45_000,
  },
  {
    id: 'pretty/lcs',
    preset: 'pretty',
    coarse: 'lcs',
    heavy: true,
    budgetMs: 30_000,
  },
  {
    id: 'pretty/patience',
    preset: 'pretty',
    coarse: 'patience',
    heavy: true,
    budgetMs: 30_000,
  },
  {
    id: 'structured/subtree-hash/myers',
    preset: 'structured',
    coarse: 'myers',
    structure: 'subtree-hash',
    heavy: true,
    budgetMs: 45_000,
  },
  {
    id: 'structured/ted-pocket/myers',
    preset: 'structured',
    coarse: 'myers',
    structure: 'ted-pocket',
    heavy: true,
    budgetMs: 30_000,
  },
  {
    id: 'structured/path-key/lcs',
    preset: 'structured',
    coarse: 'lcs',
    structure: 'path-key',
    heavy: true,
    budgetMs: 30_000,
  },
]

type CellStatus = 'ok' | 'fallback' | 'slow' | 'timeout' | 'skip' | 'error'

type Cell = {
  pair: string
  combo: string
  ms: number
  status: CellStatus
  note?: string
  opCount?: number
  light?: boolean
}

function toArrayBuffer(buf: Buffer): ArrayBuffer {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
}

function classifyHdr(hdr: string): { fallback: boolean; aborted: boolean } {
  const fallback =
    /fall\s*back|falling back|stub|too large|MAX_DP|→ Myers|→ path-key/i.test(
      hdr
    ) || hdr.includes('structured failed')
  const aborted =
    (hdr.includes('abort') || hdr.includes('too many lines')) &&
    !hdr.includes('large result')
  return { fallback, aborted }
}

async function loadTexts(
  origName: string,
  trunkName: string
): Promise<{ textA: string; textB: string } | { error: string }> {
  const ab = toArrayBuffer(readFileSync(join(ORIG_DIR, origName)))
  const bb = toArrayBuffer(readFileSync(join(TRUNK_DIR, trunkName)))
  const textA = await readZipEntryFromBuffer(ab, 'word/document.xml')
  const textB = await readZipEntryFromBuffer(bb, 'word/document.xml')
  if (textA == null || textB == null) return { error: 'missing document.xml' }
  return { textA, textB }
}

describe('Sample pair × algo matrix', () => {
  it.skipIf(!foldersPresent)(
    'every pair × matrix combos with hard timeouts; log limitations',
    async () => {
      const pairs = pairSampleDocx(readdirSync(ORIG_DIR), readdirSync(TRUNK_DIR))
      const cells: Cell[] = []

      for (const p of pairs) {
        const pairLabel = `${p.orig} ↔ ${p.trunk}`
        const sizeA = statSync(join(ORIG_DIR, p.orig)).size
        const sizeB = statSync(join(TRUNK_DIR, p.trunk)).size
        if (sizeA > 25_000_000 || sizeB > 25_000_000) {
          for (const c of MATRIX) {
            cells.push({
              pair: pairLabel,
              combo: c.id,
              ms: 0,
              status: 'skip',
              note: 'archive >25MB',
              light: c.light,
            })
          }
          continue
        }

        const loaded = await loadTexts(p.orig, p.trunk)
        if ('error' in loaded) {
          for (const c of MATRIX) {
            cells.push({
              pair: pairLabel,
              combo: c.id,
              ms: 0,
              status: 'skip',
              note: loaded.error,
              light: c.light,
            })
          }
          continue
        }

        const { textA, textB } = loaded
        const maxChars = Math.max(textA.length, textB.length)
        console.log(`\n-- ${pairLabel} (${maxChars} chars) --`)

        for (const c of MATRIX) {
          if (c.heavy && maxChars > HEAVY_MAX_CHARS) {
            cells.push({
              pair: pairLabel,
              combo: c.id,
              ms: 0,
              status: 'skip',
              note: `heavy skip (>${HEAVY_MAX_CHARS} chars)`,
              light: c.light,
            })
            continue
          }

          const result = await runMatrixCellWithTimeout(
            textA,
            textB,
            {
              preset: c.preset,
              coarse: c.coarse,
              fine: c.fine,
              structure: c.structure,
            },
            c.budgetMs
          )

          if (result.status === 'timeout') {
            cells.push({
              pair: pairLabel,
              combo: c.id,
              ms: result.ms,
              status: 'timeout',
              note: `killed after ${c.budgetMs}ms`,
              light: c.light,
            })
            console.log(
              `  timeout  ${String(result.ms).padStart(6)}ms  ${c.id}`
            )
            continue
          }

          if (result.status === 'error') {
            cells.push({
              pair: pairLabel,
              combo: c.id,
              ms: result.ms,
              status: 'error',
              note: result.error,
              light: c.light,
            })
            console.log(`  error    ${c.id}: ${result.error}`)
            continue
          }

          const { fallback, aborted } = classifyHdr(result.hdr)
          let status: CellStatus = 'ok'
          let note: string | undefined
          if (aborted) {
            status = 'error'
            note = 'hard abort'
          } else if (fallback) {
            status = 'fallback'
            note = 'soft-fallback hdr'
          }
          cells.push({
            pair: pairLabel,
            combo: c.id,
            ms: result.ms,
            status,
            note,
            opCount: result.opCount,
            light: c.light,
          })
          console.log(
            `  ${status.padEnd(8)} ${String(result.ms).padStart(6)}ms  ${c.id}`
          )
        }
      }

      const byStatus = (s: CellStatus) => cells.filter((c) => c.status === s)
      const errors = byStatus('error')
      const timeouts = byStatus('timeout')
      const fallback = byStatus('fallback')
      const slow = byStatus('slow')

      const summary = [
        `total=${cells.length}`,
        `ok=${byStatus('ok').length}`,
        `fallback=${fallback.length}`,
        `timeout=${timeouts.length}`,
        `slow=${slow.length}`,
        `skip=${byStatus('skip').length}`,
        `error=${errors.length}`,
      ].join('  ')

      const limitLines = [...timeouts, ...slow, ...fallback, ...errors]
        .map(
          (c) =>
            `${c.status.padEnd(8)} ${String(c.ms).padStart(6)}ms  ${c.combo}  ${c.pair}  ${c.note ?? ''}`
        )
        .join('\n')

      console.log('\n=== Algo matrix summary ===\n' + summary)
      if (limitLines) {
        console.log('\n=== Limitations / issues ===\n' + limitLines + '\n')
      }

      const throws = errors.filter((e) => e.note !== 'hard abort')
      expect(
        throws,
        `unexpected throws:\n${throws.map((t) => `${t.combo} ${t.pair}: ${t.note}`).join('\n')}`
      ).toEqual([])

      const lightTimeouts = timeouts.filter((t) => t.light)
      expect(
        lightTimeouts,
        `light combo timeouts (must not hang/fail):\n${lightTimeouts.map((t) => `${t.combo} ${t.pair}`).join('\n')}`
      ).toEqual([])

      expect(
        byStatus('ok').length +
          fallback.length +
          timeouts.length +
          byStatus('skip').length
      ).toBeGreaterThan(0)
    },
    1_200_000
  )
})
