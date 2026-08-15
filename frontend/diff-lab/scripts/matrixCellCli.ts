/**
 * CLI cell runner for algo matrix IT.
 * Usage: node --experimental-strip-types --import ./scripts/ts-ext-resolve.mjs ./scripts/matrixCellCli.ts <job.json>
 * Prints one JSON line to stdout: { ok, ms, opCount, hdr, error? }
 */
import { readFileSync } from 'node:fs'
import {
  detect,
  runPreset,
  DEFAULT_DIFF_OPTIONS,
} from '../src/engine/index.ts'

const jobPath = process.argv[2]
if (!jobPath) {
  console.error('usage: matrixCellCli.ts <job.json>')
  process.exit(2)
}

const job = JSON.parse(readFileSync(jobPath, 'utf8').replace(/^\uFEFF/, ''))
const { textA, textB, combo } = job

const t0 = Date.now()
try {
  const d = detect('word/document.xml', 'word/document.xml', textA, textB)
  const ops = runPreset(combo.preset, textA, textB, d, {
    ...DEFAULT_DIFF_OPTIONS,
    coarse: combo.coarse,
    fine: combo.fine ?? DEFAULT_DIFF_OPTIONS.fine,
    structure: combo.structure ?? DEFAULT_DIFF_OPTIONS.structure,
    sortAttrs: true,
    ignoreOoxmlIds: true,
  })
  const ms = Date.now() - t0
  const hdr = ops
    .filter((o) => o.kind === 'hdr')
    .map((o) => o.text)
    .join(' | ')
  process.stdout.write(
    JSON.stringify({ ok: true, ms, opCount: ops.length, hdr }) + '\n'
  )
} catch (e) {
  const ms = Date.now() - t0
  process.stdout.write(
    JSON.stringify({
      ok: false,
      ms,
      error: e instanceof Error ? e.message : String(e),
    }) + '\n'
  )
  process.exitCode = 1
}
