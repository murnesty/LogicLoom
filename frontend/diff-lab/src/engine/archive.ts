import type { EntryAvailability } from './types'

function normalizePath(p: string): string {
  return p.replace(/\\/g, '/').replace(/^\//, '')
}

export function listUnionEntries(
  filesA: string[] | null,
  filesB: string[] | null
): EntryAvailability[] {
  const setA = new Set((filesA ?? []).map(normalizePath).filter((n) => !n.endsWith('/')))
  const setB = new Set((filesB ?? []).map(normalizePath).filter((n) => !n.endsWith('/')))
  const all = new Set([...setA, ...setB])
  return [...all]
    .sort((x, y) => x.localeCompare(y, undefined, { sensitivity: 'base' }))
    .map((path) => ({
      path,
      inA: setA.has(path),
      inB: setB.has(path),
    }))
}

export function resolveEntry(paths: string[], want: string): string | null {
  const normalized = paths.map(normalizePath)
  const w = normalizePath(want)
  const exact = normalized.find((n) => n.toLowerCase() === w.toLowerCase())
  if (exact) return exact

  const fileName = w.includes('/') ? w.slice(w.lastIndexOf('/') + 1) : w
  const hits = normalized.filter((n) => {
    const base = n.includes('/') ? n.slice(n.lastIndexOf('/') + 1) : n
    return base.toLowerCase() === fileName.toLowerCase()
  })
  if (hits.length === 0) return null
  if (hits.length === 1) return hits[0]

  const ranked = [...hits].sort((a, b) => {
    const da = a.split('/').length
    const db = b.split('/').length
    if (da !== db) return da - db
    return a.length - b.length
  })
  if (ranked[0].split('/').length < ranked[1].split('/').length) return ranked[0]
  return null
}

type ZipEntry = { path: string; compression: number; data: Uint8Array }

function u16(view: DataView, o: number): number {
  return view.getUint16(o, true)
}
function u32(view: DataView, o: number): number {
  return view.getUint32(o, true)
}

function readUtf8(bytes: Uint8Array, start: number, len: number): string {
  return new TextDecoder('utf-8').decode(bytes.subarray(start, start + len))
}

/** Minimal ZIP reader (store + deflate) for Office Open XML packages. */
export function listZipEntries(buf: ArrayBuffer): ZipEntry[] {
  const bytes = new Uint8Array(buf)
  const view = new DataView(buf)
  let eocd = -1
  for (let i = bytes.length - 22; i >= 0; i--) {
    if (u32(view, i) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd < 0) throw new Error('Not a zip archive (EOCD missing)')

  const count = u16(view, eocd + 10)
  let offset = u32(view, eocd + 16)
  const entries: ZipEntry[] = []

  for (let n = 0; n < count; n++) {
    if (u32(view, offset) !== 0x02014b50) throw new Error('Bad central directory')
    const compression = u16(view, offset + 10)
    const compSize = u32(view, offset + 20)
    const nameLen = u16(view, offset + 28)
    const extraLen = u16(view, offset + 30)
    const commentLen = u16(view, offset + 32)
    const localHeader = u32(view, offset + 42)
    const path = normalizePath(readUtf8(bytes, offset + 46, nameLen))
    offset += 46 + nameLen + extraLen + commentLen

    if (path.endsWith('/')) continue

    if (u32(view, localHeader) !== 0x04034b50) throw new Error(`Bad local header: ${path}`)
    const localNameLen = u16(view, localHeader + 26)
    const localExtraLen = u16(view, localHeader + 28)
    const dataStart = localHeader + 30 + localNameLen + localExtraLen
    const data = bytes.subarray(dataStart, dataStart + compSize)
    entries.push({ path, compression, data })
  }
  return entries
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('DecompressionStream is required to read compressed zip entries')
  }
  const ds = new DecompressionStream('deflate-raw')
  const copy = new Uint8Array(data.byteLength)
  copy.set(data)
  const stream = new Blob([copy]).stream().pipeThrough(ds)
  const ab = await new Response(stream).arrayBuffer()
  return new Uint8Array(ab)
}

async function entryText(entry: ZipEntry): Promise<string> {
  let raw: Uint8Array
  if (entry.compression === 0) raw = entry.data
  else if (entry.compression === 8) raw = await inflateRaw(entry.data)
  else throw new Error(`Unsupported compression ${entry.compression} for ${entry.path}`)
  return new TextDecoder('utf-8').decode(raw)
}

export async function loadZipPathsFromBuffer(buf: ArrayBuffer): Promise<string[]> {
  return listZipEntries(buf).map((e) => e.path)
}

export async function readZipEntryFromBuffer(
  buf: ArrayBuffer,
  entryPath: string
): Promise<string | null> {
  const entries = listZipEntries(buf)
  const resolved = resolveEntry(
    entries.map((e) => e.path),
    entryPath
  )
  if (!resolved) return null
  const hit = entries.find((e) => e.path === resolved)
  if (!hit) return null
  return entryText(hit)
}
