/**
 * Spawn matrixCellCli in a child process; kill after budgetMs → timeout.
 */
import { spawn } from 'node:child_process'
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

export type MatrixComboJob = {
  preset: string
  coarse: string
  fine?: string
  structure?: string
}

export type MatrixCellResult =
  | { status: 'ok'; ms: number; opCount: number; hdr: string }
  | { status: 'error'; ms: number; error: string }
  | { status: 'timeout'; ms: number }

export function runMatrixCellWithTimeout(
  textA: string,
  textB: string,
  combo: MatrixComboJob,
  budgetMs: number
): Promise<MatrixCellResult> {
  const dir = mkdtempSync(join(tmpdir(), 'difflab-matrix-'))
  const jobPath = join(dir, 'job.json')
  writeFileSync(
    jobPath,
    JSON.stringify({ textA, textB, combo }),
    'utf8'
  )

  return new Promise((resolve) => {
    const t0 = Date.now()
    let settled = false
    let stdout = ''
    let stderr = ''

    const child = spawn(
      process.execPath,
      [
        '--experimental-strip-types',
        '--import',
        './scripts/register-ts-ext.mjs',
        './scripts/matrixCellCli.ts',
        jobPath,
      ],
      {
        cwd: ROOT,
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      }
    )

    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      child.kill('SIGKILL')
      cleanup()
      resolve({ status: 'timeout', ms: Date.now() - t0 })
    }, budgetMs)

    child.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8')
    })
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8')
    })

    child.on('error', (err) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      cleanup()
      resolve({ status: 'error', ms: Date.now() - t0, error: err.message })
    })

    child.on('close', () => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      cleanup()
      const line = stdout.trim().split(/\r?\n/).filter(Boolean).pop() ?? ''
      try {
        const parsed = JSON.parse(line) as {
          ok: boolean
          ms: number
          opCount?: number
          hdr?: string
          error?: string
        }
        if (parsed.ok) {
          resolve({
            status: 'ok',
            ms: parsed.ms,
            opCount: parsed.opCount ?? 0,
            hdr: parsed.hdr ?? '',
          })
        } else {
          resolve({
            status: 'error',
            ms: parsed.ms ?? Date.now() - t0,
            error: parsed.error ?? (stderr || 'cell failed'),
          })
        }
      } catch {
        resolve({
          status: 'error',
          ms: Date.now() - t0,
          error: stderr.trim() || line || 'bad worker output',
        })
      }
    })

    function cleanup() {
      try {
        rmSync(dir, { recursive: true, force: true })
      } catch {
        /* ignore */
      }
    }
  })
}
