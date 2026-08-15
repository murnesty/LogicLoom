import { describe, it, expect } from 'vitest'
import {
  listUnionEntries,
  resolveEntry,
  loadZipPathsFromBuffer,
  readZipEntryFromBuffer,
} from './archive'

async function deflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const cs = new CompressionStream('deflate-raw')
  const copy = new Uint8Array(data.byteLength)
  copy.set(data)
  const stream = new Blob([copy]).stream().pipeThrough(cs)
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

async function buildZip(files: Record<string, string>): Promise<ArrayBuffer> {
  const parts: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0

  const enc = new TextEncoder()
  for (const [name, text] of Object.entries(files)) {
    const nameBytes = enc.encode(name)
    const raw = enc.encode(text)
    const compressed = await deflateRaw(raw)
    const local = new Uint8Array(30 + nameBytes.length + compressed.length)
    const lv = new DataView(local.buffer)
    lv.setUint32(0, 0x04034b50, true)
    lv.setUint16(8, 8, true)
    lv.setUint32(18, compressed.length, true)
    lv.setUint32(22, raw.length, true)
    lv.setUint16(26, nameBytes.length, true)
    local.set(nameBytes, 30)
    local.set(compressed, 30 + nameBytes.length)

    const cen = new Uint8Array(46 + nameBytes.length)
    const cv = new DataView(cen.buffer)
    cv.setUint32(0, 0x02014b50, true)
    cv.setUint16(10, 8, true)
    cv.setUint32(20, compressed.length, true)
    cv.setUint32(24, raw.length, true)
    cv.setUint16(28, nameBytes.length, true)
    cv.setUint32(42, offset, true)
    cen.set(nameBytes, 46)

    parts.push(local)
    central.push(cen)
    offset += local.length
  }

  const centralSize = central.reduce((s, c) => s + c.length, 0)
  const eocd = new Uint8Array(22)
  const ev = new DataView(eocd.buffer)
  ev.setUint32(0, 0x06054b50, true)
  ev.setUint16(8, central.length, true)
  ev.setUint16(10, central.length, true)
  ev.setUint32(12, centralSize, true)
  ev.setUint32(16, offset, true)

  const out = new Uint8Array(offset + centralSize + 22)
  let p = 0
  for (const part of parts) {
    out.set(part, p)
    p += part.length
  }
  for (const c of central) {
    out.set(c, p)
    p += c.length
  }
  out.set(eocd, p)
  return out.buffer
}

describe('listUnionEntries', () => {
  it('unions and sorts with availability', () => {
    expect(
      listUnionEntries(['word/b.xml', 'word/a.xml'], ['word/a.xml', 'word/c.xml'])
    ).toEqual([
      { path: 'word/a.xml', inA: true, inB: true },
      { path: 'word/b.xml', inA: true, inB: false },
      { path: 'word/c.xml', inA: false, inB: true },
    ])
  })
})

describe('resolveEntry', () => {
  it('prefers shallowest filename match', () => {
    expect(
      resolveEntry(
        ['word/document.xml', 'word/glossary/document.xml'],
        'document.xml'
      )
    ).toBe('word/document.xml')
  })
})

describe('zip buffers', () => {
  it('lists and reads entries', async () => {
    const buf = await buildZip({ 'word/document.xml': '<a/>' })
    expect(await loadZipPathsFromBuffer(buf)).toContain('word/document.xml')
    expect(await readZipEntryFromBuffer(buf, 'word/document.xml')).toBe('<a/>')
    expect(await readZipEntryFromBuffer(buf, 'missing.xml')).toBeNull()
  })
})
