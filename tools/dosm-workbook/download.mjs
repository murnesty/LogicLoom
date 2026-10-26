import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as XLSX from 'xlsx'
import { DATASETS, MANIFEST_SHEET } from './datasets.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.join(__dirname, 'out')
const RAW_DIR = path.join(OUT_DIR, 'csv')
const XLSX_PATH = path.join(OUT_DIR, 'dosm-demography.xlsx')

const includeStatePop = process.argv.includes('--include-state-pop')

function parseCsv(text) {
  // DOSM files are simple comma CSVs without embedded newlines in fields.
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.length > 0)
  return lines.map((line) => line.split(','))
}

async function downloadText(url) {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} for ${url}`)
  }
  return res.text()
}

async function main() {
  await mkdir(RAW_DIR, { recursive: true })

  const selected = DATASETS.filter((d) => includeStatePop || !d.large)
  const wb = XLSX.utils.book_new()
  const manifest = [
    ['sheet', 'url', 'note', 'rows', 'bytes', 'fetched_at'],
  ]
  const fetchedAt = new Date().toISOString()

  console.log(
    `Downloading ${selected.length} dataset(s)${
      includeStatePop ? ' (including pop_state)' : ' (skip pop_state; pass --include-state-pop)'
    }…`,
  )

  for (const ds of selected) {
    process.stdout.write(`  ${ds.sheet} … `)
    try {
      const text = await downloadText(ds.url)
      const csvPath = path.join(RAW_DIR, `${ds.sheet}.csv`)
      await writeFile(csvPath, text, 'utf8')

      const rows = parseCsv(text)
      const ws = XLSX.utils.aoa_to_sheet(rows)
      XLSX.utils.book_append_sheet(wb, ws, ds.sheet)

      const dataRows = Math.max(0, rows.length - 1)
      manifest.push([
        ds.sheet,
        ds.url,
        ds.note,
        String(dataRows),
        String(Buffer.byteLength(text, 'utf8')),
        fetchedAt,
      ])
      console.log(`ok (${dataRows} rows)`)
    } catch (err) {
      console.log('FAIL')
      manifest.push([
        ds.sheet,
        ds.url,
        `ERROR: ${err instanceof Error ? err.message : String(err)}`,
        '',
        '',
        fetchedAt,
      ])
    }
  }

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(manifest), MANIFEST_SHEET)
  XLSX.writeFile(wb, XLSX_PATH)

  console.log(`\nWrote workbook: ${XLSX_PATH}`)
  console.log(`Wrote raw CSVs:  ${RAW_DIR}`)
  console.log('Open the .xlsx in Excel — one sheet per dataset (+ _manifest).')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
